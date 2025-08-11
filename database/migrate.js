const fs = require('fs');
const path = require('path');
const db = require('./db');

// Position file mapping
const POSITION_FILES = {
  'QB': 'quarterbacks.json',
  'RB': 'runningbacks.json',
  'WR': 'widereceivers.json',
  'TE': 'tightends.json',
  'K': 'kickers.json',
  'DST': 'defenses.json'
};

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Clear existing players
    await db.query('DELETE FROM players');
    console.log('Cleared existing players table');
    
    // Load and insert players from each position file
    for (const [position, filename] of Object.entries(POSITION_FILES)) {
      const filePath = path.join(__dirname, '..', 'data', filename);
      
      if (fs.existsSync(filePath)) {
        const players = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`Loading ${players.length} ${position} players from ${filename}...`);
        
        for (const player of players) {
          await db.query(
            `INSERT INTO players (
              id, name, position, team, adp, is_drafted, is_my_team,
              stats_2024, projected_stats_2025, fantasy_data_url, strength_of_schedule
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              position = EXCLUDED.position,
              team = EXCLUDED.team,
              adp = EXCLUDED.adp,
              is_drafted = EXCLUDED.is_drafted,
              is_my_team = EXCLUDED.is_my_team,
              stats_2024 = EXCLUDED.stats_2024,
              projected_stats_2025 = EXCLUDED.projected_stats_2025,
              fantasy_data_url = EXCLUDED.fantasy_data_url,
              strength_of_schedule = EXCLUDED.strength_of_schedule`,
            [
              player.id,
              player.name,
              player.position,
              player.team,
              player.adp || null,
              player.isDrafted || false,
              player.isMyTeam || false,
              JSON.stringify(player.stats2024 || {}),
              JSON.stringify(player.projectedStats2025 || {}),
              player.fantasyDataUrl || null,
              player.strengthOfSchedule || null
            ]
          );
        }
        console.log(`✓ Loaded ${players.length} ${position} players`);
      }
    }
    
    // Load scoring settings if they exist
    const scoringPath = path.join(__dirname, '..', 'data', 'scoring.json');
    if (fs.existsSync(scoringPath)) {
      const scoring = JSON.parse(fs.readFileSync(scoringPath, 'utf8'));
      await db.query(
        `INSERT INTO scoring_settings (name, settings, is_active)
         VALUES ('custom', $1, true)
         ON CONFLICT (name) DO UPDATE SET
           settings = EXCLUDED.settings,
           is_active = true`,
        [JSON.stringify(scoring)]
      );
      
      // Deactivate default if custom exists
      await db.query(
        `UPDATE scoring_settings SET is_active = false WHERE name = 'default'`
      );
      console.log('✓ Loaded custom scoring settings');
    }
    
    // Load position requirements if they exist
    const posReqPath = path.join(__dirname, '..', 'data', 'position-requirements.json');
    if (fs.existsSync(posReqPath)) {
      const requirements = JSON.parse(fs.readFileSync(posReqPath, 'utf8'));
      await db.query(
        `INSERT INTO position_requirements (name, requirements, is_active)
         VALUES ('custom', $1, true)
         ON CONFLICT (name) DO UPDATE SET
           requirements = EXCLUDED.requirements,
           is_active = true`,
        [JSON.stringify(requirements)]
      );
      
      // Deactivate default if custom exists
      await db.query(
        `UPDATE position_requirements SET is_active = false WHERE name = 'default'`
      );
      console.log('✓ Loaded custom position requirements');
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();