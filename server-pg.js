const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Get all players
app.get('/api/players', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, name, position, team, adp, is_drafted, is_my_team,
        stats_2024, projected_stats_2025, fantasy_data_url, strength_of_schedule
      FROM players 
      ORDER BY position, adp
    `);
    
    // Convert database format to frontend format
    const players = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      position: row.position,
      team: row.team,
      adp: parseFloat(row.adp) || null,
      isDrafted: row.is_drafted,
      isMyTeam: row.is_my_team,
      stats2024: row.stats_2024,
      projectedStats2025: row.projected_stats_2025,
      fantasyDataUrl: row.fantasy_data_url,
      strengthOfSchedule: parseFloat(row.strength_of_schedule) || null
    }));
    
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Update player
app.post('/api/players/update', async (req, res) => {
  const { playerId, field, value } = req.body;
  
  try {
    // Map frontend field names to database column names
    const fieldMap = {
      'isDrafted': 'is_drafted',
      'isMyTeam': 'is_my_team'
    };
    
    const dbField = fieldMap[field] || field;
    
    // Update the player in the database
    const result = await db.query(
      `UPDATE players SET ${dbField} = $1 WHERE id = $2 RETURNING *`,
      [value, playerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }
    
    res.json({ success: true, player: result.rows[0] });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ success: false, error: 'Failed to update player' });
  }
});

// Get scoring settings
app.get('/api/scoring', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT settings FROM scoring_settings WHERE is_active = true LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      // Return default if nothing is active
      return res.json({
        passing: { yards: 0.04, touchdowns: 4, interceptions: -1, twoPointConversions: 2 },
        rushing: { yards: 0.1, touchdowns: 6, twoPointConversions: 2 },
        receiving: { receptions: 1, yards: 0.1, touchdowns: 6, twoPointConversions: 2 },
        defense: {
          sacks: 1, interceptions: 2, fumblesRecovered: 2, touchdowns: 6,
          safeties: 2, blockedKicks: 2, pointsAllowed0: 10, pointsAllowed1_6: 7,
          pointsAllowed7_13: 4, pointsAllowed14_20: 1, pointsAllowed21_27: 0,
          pointsAllowed28_34: -1, pointsAllowed35Plus: -4
        }
      });
    }
    
    res.json(result.rows[0].settings);
  } catch (error) {
    console.error('Error fetching scoring settings:', error);
    res.status(500).json({ error: 'Failed to fetch scoring settings' });
  }
});

// Update scoring settings
app.post('/api/scoring', async (req, res) => {
  try {
    const settings = req.body;
    
    // Deactivate all existing settings
    await db.query('UPDATE scoring_settings SET is_active = false');
    
    // Insert or update custom settings
    const result = await db.query(
      `INSERT INTO scoring_settings (name, settings, is_active)
       VALUES ('custom', $1, true)
       ON CONFLICT (name) DO UPDATE SET
         settings = EXCLUDED.settings,
         is_active = true
       RETURNING *`,
      [JSON.stringify(settings)]
    );
    
    res.json({ success: true, scoring: result.rows[0].settings });
  } catch (error) {
    console.error('Error saving scoring settings:', error);
    res.status(500).json({ success: false, message: 'Error saving scoring settings' });
  }
});

// Get position requirements
app.get('/api/position-requirements', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT requirements FROM position_requirements WHERE is_active = true LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      // Return default if nothing is active
      return res.json({
        QB: { min: 1, max: 3 },
        RB: { min: 2, max: 6 },
        WR: { min: 2, max: 6 },
        TE: { min: 1, max: 3 },
        K: { min: 1, max: 1 },
        DST: { min: 1, max: 2 },
        flex: { count: 1, superflex: false },
        bench: 6
      });
    }
    
    res.json(result.rows[0].requirements);
  } catch (error) {
    console.error('Error fetching position requirements:', error);
    res.status(500).json({ error: 'Failed to fetch position requirements' });
  }
});

// Update position requirements
app.post('/api/position-requirements', async (req, res) => {
  try {
    const requirements = req.body;
    
    // Deactivate all existing requirements
    await db.query('UPDATE position_requirements SET is_active = false');
    
    // Insert or update custom requirements
    const result = await db.query(
      `INSERT INTO position_requirements (name, requirements, is_active)
       VALUES ('custom', $1, true)
       ON CONFLICT (name) DO UPDATE SET
         requirements = EXCLUDED.requirements,
         is_active = true
       RETURNING *`,
      [JSON.stringify(requirements)]
    );
    
    res.json({ success: true, requirements: result.rows[0].requirements });
  } catch (error) {
    console.error('Error saving position requirements:', error);
    res.status(500).json({ success: false, message: 'Error saving position requirements' });
  }
});

// Export data endpoint
app.get('/api/export', async (req, res) => {
  try {
    const playersResult = await db.query(`
      SELECT * FROM players 
      WHERE is_drafted = true OR is_my_team = true
      ORDER BY position, name
    `);
    
    const scoringResult = await db.query(
      'SELECT settings FROM scoring_settings WHERE is_active = true LIMIT 1'
    );
    
    const requirementsResult = await db.query(
      'SELECT requirements FROM position_requirements WHERE is_active = true LIMIT 1'
    );
    
    const exportData = {
      exportDate: new Date().toISOString(),
      players: playersResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        position: row.position,
        team: row.team,
        isDrafted: row.is_drafted,
        isMyTeam: row.is_my_team
      })),
      scoring: scoringResult.rows[0]?.settings || {},
      positionRequirements: requirementsResult.rows[0]?.requirements || {}
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Import data endpoint
app.post('/api/import', async (req, res) => {
  const { players, scoring, positionRequirements } = req.body;
  
  try {
    // Begin transaction
    await db.query('BEGIN');
    
    // Update players if provided
    if (players && Array.isArray(players)) {
      for (const player of players) {
        await db.query(
          `UPDATE players 
           SET is_drafted = $1, is_my_team = $2 
           WHERE id = $3`,
          [player.isDrafted || false, player.isMyTeam || false, player.id]
        );
      }
    }
    
    // Update scoring if provided
    if (scoring) {
      await db.query('UPDATE scoring_settings SET is_active = false');
      await db.query(
        `INSERT INTO scoring_settings (name, settings, is_active)
         VALUES ('imported', $1, true)
         ON CONFLICT (name) DO UPDATE SET
           settings = EXCLUDED.settings,
           is_active = true`,
        [JSON.stringify(scoring)]
      );
    }
    
    // Update position requirements if provided
    if (positionRequirements) {
      await db.query('UPDATE position_requirements SET is_active = false');
      await db.query(
        `INSERT INTO position_requirements (name, requirements, is_active)
         VALUES ('imported', $1, true)
         ON CONFLICT (name) DO UPDATE SET
           requirements = EXCLUDED.requirements,
           is_active = true`,
        [JSON.stringify(positionRequirements)]
      );
    }
    
    // Commit transaction
    await db.query('COMMIT');
    
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    // Rollback on error
    await db.query('ROLLBACK');
    console.error('Error importing data:', error);
    res.status(500).json({ success: false, error: 'Failed to import data' });
  }
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
    console.log(`Server running on ${isProduction ? 'port' : 'http://localhost:'}${PORT} (${isProduction ? 'production' : 'development'} mode)`);
  });
  
  module.exports = { app, server };
} else {
  module.exports = { app };
}