const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const playersDataPath = path.join(__dirname, 'data', 'players.json');
const scoringDataPath = path.join(__dirname, 'data', 'scoring.json');

let playersData = [];
let scoringData = null;

if (fs.existsSync(playersDataPath)) {
  playersData = JSON.parse(fs.readFileSync(playersDataPath, 'utf8'));
}

if (fs.existsSync(scoringDataPath)) {
  scoringData = JSON.parse(fs.readFileSync(scoringDataPath, 'utf8'));
}

app.get('/api/players', (req, res) => {
  res.json(playersData);
});

app.post('/api/players/update', (req, res) => {
  const { playerId, field, value } = req.body;
  const player = playersData.find(p => p.id === playerId);
  
  if (player) {
    player[field] = value;
    fs.writeFileSync(playersDataPath, JSON.stringify(playersData, null, 2));
    res.json({ success: true, player });
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

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  module.exports = { app, server };
} else {
  module.exports = { app };
}