const fs = require('fs');
const path = require('path');
const db = require('./db');

async function importPlayers() {
  try {
    // Read players.json if it exists, otherwise combine individual position files
    let players = [];
    
    const playersJsonPath = path.join(__dirname, '../data/players.json');
    if (fs.existsSync(playersJsonPath)) {
      console.log('Loading players from players.json...');
      const data = fs.readFileSync(playersJsonPath, 'utf8');
      players = JSON.parse(data);
    } else {
      console.log('Loading players from individual position files...');
      const positions = ['quarterbacks', 'runningbacks', 'widereceivers', 'tightends', 'kickers', 'defenses'];
      
      for (const posFile of positions) {
        const filePath = path.join(__dirname, `../data/${posFile}.json`);
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf8');
          const posPlayers = JSON.parse(data);
          players = players.concat(posPlayers);
        }
      }
    }
    
    console.log(`Found ${players.length} players to import`);
    
    // Clear existing players
    await db.query('DELETE FROM players');
    
    // Insert players
    for (const player of players) {
      const query = `
        INSERT INTO players (
          id, name, position, team, adp, is_drafted, is_my_team,
          stats_2024, projected_stats_2025, fantasy_data_url, strength_of_schedule
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      const values = [
        player.id || `${player.name}_${player.team}`.replace(/\s+/g, '_'),
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
      ];
      
      await db.query(query, values);
    }
    
    console.log('Players imported successfully!');
    
    // Verify import
    const result = await db.query('SELECT COUNT(*) FROM players');
    console.log(`Total players in database: ${result.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error importing players:', error);
    process.exit(1);
  }
}

importPlayers();