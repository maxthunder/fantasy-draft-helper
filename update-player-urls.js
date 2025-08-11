const fs = require('fs');
const path = require('path');

// Position file mapping
const POSITION_FILES = {
  'QB': 'quarterbacks.json',
  'RB': 'runningbacks.json',
  'WR': 'widereceivers.json',
  'TE': 'tightends.json',
  'K': 'kickers.json',
  'DST': 'defenses.json'
};

// Load all players from position files
function loadAllPlayers() {
  const allPlayers = [];
  
  Object.entries(POSITION_FILES).forEach(([position, filename]) => {
    const filePath = path.join(__dirname, 'data', filename);
    if (fs.existsSync(filePath)) {
      const positionPlayers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      allPlayers.push(...positionPlayers.map(p => ({ ...p, _file: filename })));
    }
  });
  
  return allPlayers;
}

// Save players back to their position files
function savePlayersByPosition(players) {
  const playersByFile = {};
  
  // Group players by their file
  players.forEach(player => {
    const filename = player._file;
    delete player._file; // Remove the temporary file marker
    
    if (!playersByFile[filename]) {
      playersByFile[filename] = [];
    }
    playersByFile[filename].push(player);
  });
  
  // Save each position file
  Object.entries(playersByFile).forEach(([filename, positionPlayers]) => {
    const filePath = path.join(__dirname, 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(positionPlayers, null, 2));
    console.log(`Updated ${filename} with ${positionPlayers.length} players`);
  });
}

// Manually map player names to their FantasyData URLs based on search results
const playerUrlMappings = {
  // Quarterbacks
  "Josh Allen": "https://fantasydata.com/nfl/josh-allen-fantasy/19801",
  "Lamar Jackson": "https://fantasydata.com/nfl/lamar-jackson-fantasy/19781",
  "Joe Burrow": "https://fantasydata.com/nfl/joe-burrow-fantasy/21693",
  "Patrick Mahomes": "https://fantasydata.com/nfl/patrick-mahomes-fantasy/18890",
  "Jayden Daniels": "https://fantasydata.com/nfl/jayden-daniels-fantasy/23235",
  "C.J. Stroud": "https://fantasydata.com/nfl/cj-stroud-fantasy/23239",
  
  // Running Backs
  "Bijan Robinson": "https://fantasydata.com/nfl/bijan-robinson-fantasy/23189",
  "Jahmyr Gibbs": "https://fantasydata.com/nfl/jahmyr-gibbs-fantasy/23200",
  "Saquon Barkley": "https://fantasydata.com/nfl/saquon-barkley-fantasy/19766",
  "Christian McCaffrey": "https://fantasydata.com/nfl/christian-mccaffrey-fantasy/18877",
  "Derrick Henry": "https://fantasydata.com/nfl/derrick-henry-fantasy/17959",
  
  // Wide Receivers
  "Ja'Marr Chase": "https://fantasydata.com/nfl/ja-marr-chase-fantasy/22564",
  "Justin Jefferson": "https://fantasydata.com/nfl/justin-jefferson-fantasy/21685",
  "CeeDee Lamb": "https://fantasydata.com/nfl/ceedee-lamb-fantasy/21679",
  "Amon-Ra St. Brown": "https://fantasydata.com/nfl/amon-ra-st-brown-fantasy/22587",
  "Tyreek Hill": "https://fantasydata.com/nfl/tyreek-hill-fantasy/18082",
  "A.J. Brown": "https://fantasydata.com/nfl/a-j-brown-fantasy/21042",
  
  // Tight Ends
  "Brock Bowers": "https://fantasydata.com/nfl/brock-bowers-fantasy/24943",
  "Trey McBride": "https://fantasydata.com/nfl/trey-mcbride-fantasy/23251",
  "George Kittle": "https://fantasydata.com/nfl/george-kittle-kittle-fantasy/19063",
  "Sam LaPorta": "https://fantasydata.com/nfl/sam-laporta-fantasy/23141",
  "Travis Kelce": "https://fantasydata.com/nfl/travis-kelce-fantasy/15048",
};

// Function to generate a search URL for players we don't have a direct mapping for
function generateSearchUrl(playerName) {
  const searchQuery = encodeURIComponent(playerName);
  return `https://fantasydata.com/nfl/search?q=${searchQuery}`;
}

// Load all players
const players = loadAllPlayers();

// Update each player with their FantasyData URL
let mappedCount = 0;
let searchUrlCount = 0;

players.forEach(player => {
  if (playerUrlMappings[player.name]) {
    player.fantasyDataUrl = playerUrlMappings[player.name];
    mappedCount++;
  } else {
    // For players not in our mapping, provide a search URL
    player.fantasyDataUrl = generateSearchUrl(player.name);
    searchUrlCount++;
  }
});

// Save players back to their position files
savePlayersByPosition(players);

console.log('\nSuccessfully added fantasyDataUrl to all players');
console.log(`Total players updated: ${players.length}`);
console.log(`Players with direct URLs: ${mappedCount}`);
console.log(`Players with search URLs: ${searchUrlCount}`);