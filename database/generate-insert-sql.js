const fs = require('fs');
const path = require('path');

function escapeString(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function generateInsertSQL() {
  try {
    // Read players.json
    const playersPath = path.join(__dirname, '../data/players.json');
    const playersData = fs.readFileSync(playersPath, 'utf8');
    const players = JSON.parse(playersData);
    
    console.log(`Generating INSERT statements for ${players.length} players...`);
    
    let sql = '\n-- Insert player data\n';
    
    for (const player of players) {
      const id = escapeString(player.id || `${player.name}_${player.team}`.replace(/\s+/g, '_'));
      const name = escapeString(player.name);
      const position = escapeString(player.position);
      const team = escapeString(player.team);
      const adp = player.adp || 'NULL';
      const isDrafted = player.isDrafted ? 'TRUE' : 'FALSE';
      const isMyTeam = player.isMyTeam ? 'TRUE' : 'FALSE';
      const stats2024 = player.stats2024 ? escapeString(JSON.stringify(player.stats2024)) : "'{}'";
      const projectedStats2025 = player.projectedStats2025 ? escapeString(JSON.stringify(player.projectedStats2025)) : "'{}'";
      const fantasyDataUrl = player.fantasyDataUrl ? escapeString(player.fantasyDataUrl) : 'NULL';
      const strengthOfSchedule = player.strengthOfSchedule || 'NULL';
      
      sql += `INSERT INTO players (id, name, position, team, adp, is_drafted, is_my_team, stats_2024, projected_stats_2025, fantasy_data_url, strength_of_schedule) VALUES (${id}, ${name}, ${position}, ${team}, ${adp}, ${isDrafted}, ${isMyTeam}, ${stats2024}::jsonb, ${projectedStats2025}::jsonb, ${fantasyDataUrl}, ${strengthOfSchedule});\n`;
    }
    
    // Append to setup-render.sql
    const setupPath = path.join(__dirname, 'setup-render.sql');
    const existingContent = fs.readFileSync(setupPath, 'utf8');
    fs.writeFileSync(setupPath, existingContent + sql);
    
    console.log('Successfully generated INSERT statements and appended to setup-render.sql');
    console.log('\nTo load this data on Render:');
    console.log('1. Copy the External Database URL from Render dashboard');
    console.log('2. Run: psql "YOUR_RENDER_DATABASE_URL" < database/setup-render.sql');
    console.log('   OR');
    console.log('   Use the Render dashboard SQL editor and paste the contents of setup-render.sql');
    
  } catch (error) {
    console.error('Error generating SQL:', error);
    process.exit(1);
  }
}

generateInsertSQL();