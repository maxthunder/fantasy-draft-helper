const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Position file paths
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

// Load players from all position files
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

// Save player to the appropriate position file
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

playersData = loadPlayersData();

if (fs.existsSync(scoringDataPath)) {
  scoringData = JSON.parse(fs.readFileSync(scoringDataPath, 'utf8'));
}

if (fs.existsSync(positionRequirementsPath)) {
  positionRequirementsData = JSON.parse(fs.readFileSync(positionRequirementsPath, 'utf8'));
}

app.get('/api/players', (req, res) => {
  res.json(playersData);
});

app.post('/api/players/update', (req, res) => {
  const { playerId, field, value } = req.body;
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

app.get('/api/scoring', (req, res) => {
  const scoring = scoringData || defaultScoring;
  res.json(scoring);
});

app.post('/api/scoring', (req, res) => {
  try {
    scoringData = req.body;
    
    if (!fs.existsSync(path.dirname(scoringDataPath))) {
      fs.mkdirSync(path.dirname(scoringDataPath), { recursive: true });
    }
    
    fs.writeFileSync(scoringDataPath, JSON.stringify(scoringData, null, 2));
    
    res.json({ success: true, scoring: scoringData });
  } catch (error) {
    console.error('Error saving scoring settings:', error);
    res.status(500).json({ success: false, message: 'Error saving scoring settings' });
  }
});

app.post('/api/scoring/update', (req, res) => {
  try {
    scoringData = req.body;
    
    if (!fs.existsSync(path.dirname(scoringDataPath))) {
      fs.mkdirSync(path.dirname(scoringDataPath), { recursive: true });
    }
    
    fs.writeFileSync(scoringDataPath, JSON.stringify(scoringData, null, 2));
    
    res.json({ success: true, scoring: scoringData });
  } catch (error) {
    console.error('Error saving scoring settings:', error);
    res.status(500).json({ success: false, message: 'Error saving scoring settings' });
  }
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

app.get('/api/position-requirements', (req, res) => {
  res.json(positionRequirementsData || defaultPositionRequirements);
});

app.post('/api/position-requirements', (req, res) => {
  try {
    positionRequirementsData = req.body;
    
    if (!fs.existsSync(path.dirname(positionRequirementsPath))) {
      fs.mkdirSync(path.dirname(positionRequirementsPath), { recursive: true });
    }
    
    fs.writeFileSync(positionRequirementsPath, JSON.stringify(positionRequirementsData, null, 2));
    
    res.json({ success: true, requirements: positionRequirementsData });
  } catch (error) {
    console.error('Error saving position requirements:', error);
    res.status(500).json({ success: false, message: 'Error saving position requirements' });
  }
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  module.exports = { app, server };
} else {
  module.exports = { app };
}