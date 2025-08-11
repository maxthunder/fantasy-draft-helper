const fs = require('fs');
const path = require('path');

// Position to filename mapping
const POSITION_FILES = {
    'QB': 'quarterbacks.json',
    'RB': 'runningbacks.json',
    'WR': 'widereceivers.json',
    'TE': 'tightends.json',
    'K': 'kickers.json',
    'DST': 'defenses.json'
};

function splitPlayersByPosition() {
    try {
        // Read the original players.json
        const playersPath = path.join(__dirname, '..', 'data', 'players.json');
        const playersData = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
        
        // Group players by position
        const playersByPosition = {};
        
        playersData.forEach(player => {
            const position = player.position;
            if (!playersByPosition[position]) {
                playersByPosition[position] = [];
            }
            playersByPosition[position].push(player);
        });
        
        // Write each position to its own file
        Object.entries(playersByPosition).forEach(([position, players]) => {
            const filename = POSITION_FILES[position];
            if (filename) {
                const filePath = path.join(__dirname, '..', 'data', filename);
                fs.writeFileSync(filePath, JSON.stringify(players, null, 2));
                console.log(`Created ${filename} with ${players.length} players`);
            } else {
                console.warn(`Unknown position: ${position}`);
            }
        });
        
        // Backup the original players.json
        const backupPath = path.join(__dirname, '..', 'data', 'players.json.backup');
        fs.copyFileSync(playersPath, backupPath);
        console.log('\nOriginal players.json backed up to players.json.backup');
        
        console.log('\nSuccessfully split players.json into position-based files!');
        
    } catch (error) {
        console.error('Error splitting players file:', error);
        process.exit(1);
    }
}

// Run the script
splitPlayersByPosition();