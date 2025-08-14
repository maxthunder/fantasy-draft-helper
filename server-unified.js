const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Try to load database module
let db = null;
let isDatabaseAvailable = false;

try {
  db = require('./database/db');
  // Check if database is available after a brief delay to allow connection
  setTimeout(() => {
    isDatabaseAvailable = db.isDatabaseAvailable();
    console.log(`Database availability: ${isDatabaseAvailable}`);
  }, 1000);
} catch (error) {
  console.error('Database module not available, using JSON fallback:', error.message);
  isDatabaseAvailable = false;
}

// Position file paths for JSON fallback
const POSITION_FILES = {
  'QB': 'quarterbacks.json',
  'RB': 'runningbacks.json',
  'WR': 'widereceivers.json',
  'TE': 'tightends.json',
  'K': 'kickers.json',
  'DST': 'defenses.json'
};

const scoringDataPath = path.join(__dirname, 'data', 'scoring.json');
const positionRequirementsPath = path.join(__dirname, 'data', 'position-requirements.json');

let playersData = [];
let scoringData = null;
let positionRequirementsData = null;

// Load players from all position files (for JSON fallback)
function loadPlayersData() {
  const allPlayers = [];
  
  Object.entries(POSITION_FILES).forEach(([position, filename]) => {
    const filePath = path.join(__dirname, 'data', filename);
    if (fs.existsSync(filePath)) {
      try {
        const positionPlayers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        allPlayers.push(...positionPlayers);
      } catch (error) {
        console.error(`Error loading ${filename}:`, error);
      }
    }
  });
  
  return allPlayers;
}

// Save player to the appropriate position file (for JSON fallback)
function savePlayerToFile(player) {
  const filename = POSITION_FILES[player.position];
  if (!filename) {
    console.error(`Unknown position: ${player.position}`);
    return false;
  }
  
  const filePath = path.join(__dirname, 'data', filename);
  
  // Load current players for this position
  let positionPlayers = [];
  if (fs.existsSync(filePath)) {
    positionPlayers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  
  // Update the player in the array
  const playerIndex = positionPlayers.findIndex(p => p.id === player.id);
  if (playerIndex !== -1) {
    positionPlayers[playerIndex] = player;
  } else {
    positionPlayers.push(player);
  }
  
  // Save back to file
  fs.writeFileSync(filePath, JSON.stringify(positionPlayers, null, 2));
  return true;
}

// Load JSON data on startup
playersData = loadPlayersData();

if (fs.existsSync(scoringDataPath)) {
  scoringData = JSON.parse(fs.readFileSync(scoringDataPath, 'utf8'));
}

if (fs.existsSync(positionRequirementsPath)) {
  positionRequirementsData = JSON.parse(fs.readFileSync(positionRequirementsPath, 'utf8'));
}

// Middleware to check database availability
app.use((req, res, next) => {
  if (db) {
    isDatabaseAvailable = db.isDatabaseAvailable();
  }
  res.locals.isDatabaseAvailable = isDatabaseAvailable;
  next();
});

// Get database status endpoint
app.get('/api/database-status', (req, res) => {
  res.json({ isDatabaseAvailable });
});

// Get all players
app.get('/api/players', async (req, res) => {
  if (isDatabaseAvailable) {
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
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      res.json(playersData);
    }
  } else {
    res.json(playersData);
  }
});

// Update player
app.post('/api/players/update', async (req, res) => {
  const { playerId, field, value } = req.body;
  
  if (isDatabaseAvailable) {
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
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      // Fall through to JSON handling
    }
  }
  
  // JSON fallback
  if (!isDatabaseAvailable) {
    const player = playersData.find(p => p.id === playerId);
    
    if (player) {
      player[field] = value;
      // Save to the appropriate position file
      if (savePlayerToFile(player)) {
        res.json({ success: true, player });
      } else {
        res.status(500).json({ success: false, error: 'Error saving player data' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Player not found' });
    }
  }
});

const defaultScoring = {
  passing: {
    yards: 0.04,
    touchdowns: 4,
    interceptions: -1,
    twoPointConversions: 2
  },
  rushing: {
    yards: 0.1,
    touchdowns: 6,
    twoPointConversions: 2
  },
  receiving: {
    receptions: 1,
    yards: 0.1,
    touchdowns: 6,
    twoPointConversions: 2
  },
  defense: {
    sacks: 1,
    interceptions: 2,
    fumblesRecovered: 2,
    touchdowns: 6,
    safeties: 2,
    blockedKicks: 2,
    pointsAllowed0: 10,
    pointsAllowed1_6: 7,
    pointsAllowed7_13: 4,
    pointsAllowed14_20: 1,
    pointsAllowed21_27: 0,
    pointsAllowed28_34: -1,
    pointsAllowed35Plus: -4
  }
};

// Get scoring settings
app.get('/api/scoring', async (req, res) => {
  if (isDatabaseAvailable) {
    try {
      const result = await db.query(
        'SELECT settings FROM scoring_settings WHERE is_active = true LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        return res.json(defaultScoring);
      }
      
      res.json(result.rows[0].settings);
    } catch (error) {
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      res.json(scoringData || defaultScoring);
    }
  } else {
    res.json(scoringData || defaultScoring);
  }
});

// Update scoring settings
app.post('/api/scoring', async (req, res) => {
  const settings = req.body;
  
  if (isDatabaseAvailable) {
    try {
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
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      // Fall through to JSON handling
    }
  }
  
  // JSON fallback
  if (!isDatabaseAvailable) {
    try {
      scoringData = settings;
      
      if (!fs.existsSync(path.dirname(scoringDataPath))) {
        fs.mkdirSync(path.dirname(scoringDataPath), { recursive: true });
      }
      
      fs.writeFileSync(scoringDataPath, JSON.stringify(scoringData, null, 2));
      
      res.json({ success: true, scoring: scoringData });
    } catch (error) {
      console.error('Error saving scoring settings:', error);
      res.status(500).json({ success: false, message: 'Error saving scoring settings' });
    }
  }
});

// Alias for scoring update
app.post('/api/scoring/update', (req, res) => {
  return app._router.handle({ ...req, url: '/api/scoring', method: 'POST' }, res);
});

const defaultPositionRequirements = {
  QB: { min: 1, max: 3 },
  RB: { min: 2, max: 6 },
  WR: { min: 2, max: 6 },
  TE: { min: 1, max: 3 },
  K: { min: 1, max: 1 },
  DST: { min: 1, max: 2 },
  flex: { count: 1, superflex: false },
  bench: 6
};

// Get position requirements
app.get('/api/position-requirements', async (req, res) => {
  if (isDatabaseAvailable) {
    try {
      const result = await db.query(
        'SELECT requirements FROM position_requirements WHERE is_active = true LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        return res.json(defaultPositionRequirements);
      }
      
      res.json(result.rows[0].requirements);
    } catch (error) {
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      res.json(positionRequirementsData || defaultPositionRequirements);
    }
  } else {
    res.json(positionRequirementsData || defaultPositionRequirements);
  }
});

// Update position requirements
app.post('/api/position-requirements', async (req, res) => {
  const requirements = req.body;
  
  if (isDatabaseAvailable) {
    try {
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
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      // Fall through to JSON handling
    }
  }
  
  // JSON fallback
  if (!isDatabaseAvailable) {
    try {
      positionRequirementsData = requirements;
      
      if (!fs.existsSync(path.dirname(positionRequirementsPath))) {
        fs.mkdirSync(path.dirname(positionRequirementsPath), { recursive: true });
      }
      
      fs.writeFileSync(positionRequirementsPath, JSON.stringify(positionRequirementsData, null, 2));
      
      res.json({ success: true, requirements: positionRequirementsData });
    } catch (error) {
      console.error('Error saving position requirements:', error);
      res.status(500).json({ success: false, message: 'Error saving position requirements' });
    }
  }
});

// Export data endpoint
app.get('/api/export', async (req, res) => {
  if (isDatabaseAvailable) {
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
        scoring: scoringResult.rows[0]?.settings || defaultScoring,
        positionRequirements: requirementsResult.rows[0]?.requirements || defaultPositionRequirements
      };
      
      res.json(exportData);
    } catch (error) {
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      // Fall through to JSON handling
    }
  }
  
  // JSON fallback
  if (!isDatabaseAvailable) {
    const draftedPlayers = playersData.filter(p => p.isDrafted || p.isMyTeam);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      players: draftedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        isDrafted: p.isDrafted,
        isMyTeam: p.isMyTeam
      })),
      scoring: scoringData || defaultScoring,
      positionRequirements: positionRequirementsData || defaultPositionRequirements
    };
    
    res.json(exportData);
  }
});

// Import data endpoint
app.post('/api/import', async (req, res) => {
  const { players, scoring, positionRequirements } = req.body;
  
  if (isDatabaseAvailable) {
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
      console.error('Database error, falling back to JSON:', error);
      isDatabaseAvailable = false;
      // Fall through to JSON handling
    }
  }
  
  // JSON fallback
  if (!isDatabaseAvailable) {
    try {
      // Update players if provided
      if (players && Array.isArray(players)) {
        players.forEach(importedPlayer => {
          const player = playersData.find(p => p.id === importedPlayer.id);
          if (player) {
            player.isDrafted = importedPlayer.isDrafted || false;
            player.isMyTeam = importedPlayer.isMyTeam || false;
            savePlayerToFile(player);
          }
        });
      }
      
      // Update scoring if provided
      if (scoring) {
        scoringData = scoring;
        fs.writeFileSync(scoringDataPath, JSON.stringify(scoringData, null, 2));
      }
      
      // Update position requirements if provided
      if (positionRequirements) {
        positionRequirementsData = positionRequirements;
        fs.writeFileSync(positionRequirementsPath, JSON.stringify(positionRequirementsData, null, 2));
      }
      
      res.json({ success: true, message: 'Data imported successfully' });
    } catch (error) {
      console.error('Error importing data:', error);
      res.status(500).json({ success: false, error: 'Failed to import data' });
    }
  }
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database mode: ${isDatabaseAvailable ? 'PostgreSQL' : 'JSON files (fallback)'}`);
  });
  
  module.exports = { app, server };
} else {
  module.exports = { app };
}
