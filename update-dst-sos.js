const fs = require('fs');
const path = require('path');

// Read the defenses.json file
const defensesPath = path.join(__dirname, 'data', 'defenses.json');
let defensesData = [];

if (fs.existsSync(defensesPath)) {
    defensesData = JSON.parse(fs.readFileSync(defensesPath, 'utf8'));
} else {
    console.error('defenses.json file not found!');
    process.exit(1);
}

// Strength of Schedule values for DST (lower is easier/better)
// Based on 2025 projected opponent offensive strength
const dstSoS = {
    "Baltimore Ravens": 0.95,      // Moderate schedule
    "San Francisco 49ers": 1.05,   // Slightly harder schedule
    "Dallas Cowboys": 1.15,        // Difficult schedule (NFC East)
    "Buffalo Bills": 0.85,         // Easier schedule
    "New York Jets": 0.90,         // Relatively easy schedule
    "Pittsburgh Steelers": 1.10,   // Harder schedule (AFC North)
    "Cleveland Browns": 1.12,      // Harder schedule (AFC North)
    "Kansas City Chiefs": 0.92,    // Moderate-easy schedule
    "Miami Dolphins": 0.88,        // Easier schedule
    "Houston Texans": 0.82,        // One of the easiest schedules
    "New Orleans Saints": 1.08,    // Moderate-hard schedule
    "Denver Broncos": 0.98,        // Average schedule
    "Green Bay Packers": 1.02,     // Slightly above average difficulty
    "Philadelphia Eagles": 1.18,   // Very difficult schedule (NFC East)
    "Minnesota Vikings": 0.94      // Moderate schedule
};

// Update each DST with their SoS
defensesData.forEach(defense => {
    if (dstSoS[defense.name]) {
        defense.strengthOfSchedule = dstSoS[defense.name];
        console.log(`Updated ${defense.name} with SoS: ${defense.strengthOfSchedule}`);
    }
});

// Write the updated data back to the defenses.json file
fs.writeFileSync(defensesPath, JSON.stringify(defensesData, null, 2));

console.log('\nDST Strength of Schedule update complete!');
console.log('Note: Lower SoS values (< 1.0) indicate easier schedules (better for DST)');
console.log('Higher SoS values (> 1.0) indicate harder schedules (worse for DST)');