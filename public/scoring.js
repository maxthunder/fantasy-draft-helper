let scoringSettings = {};
const CACHE_KEYS = {
    SCORING: 'fantasy_scoring_cache'
};
const CACHE_DURATION = 5 * 60 * 1000;

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

function getCachedData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                console.log(`Cache hit for ${key}`);
                return data;
            }
            console.log(`Cache expired for ${key}`);
        }
    } catch (error) {
        console.error('Error reading cache:', error);
    }
    return null;
}

function setCachedData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        console.log(`Cache set for ${key}`);
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

async function loadScoringSettings() {
    try {
        const cachedData = getCachedData(CACHE_KEYS.SCORING);
        if (cachedData) {
            scoringSettings = cachedData;
            populateForm(scoringSettings);
            return;
        }
        
        const response = await fetch('/api/scoring');
        scoringSettings = await response.json();
        setCachedData(CACHE_KEYS.SCORING, scoringSettings);
        populateForm(scoringSettings);
    } catch (error) {
        console.error('Error loading scoring settings:', error);
        showStatus('Error loading scoring settings', 'error');
    }
}

function populateForm(settings) {
    for (const category in settings) {
        for (const field in settings[category]) {
            const inputId = `${category}-${field}`;
            const input = document.getElementById(inputId);
            if (input) {
                input.value = settings[category][field];
            }
        }
    }
}

function getFormValues() {
    const settings = {
        passing: {},
        rushing: {},
        receiving: {},
        defense: {}
    };
    
    for (const category in settings) {
        const categorySettings = defaultScoring[category];
        for (const field in categorySettings) {
            const inputId = `${category}-${field}`;
            const input = document.getElementById(inputId);
            if (input) {
                settings[category][field] = parseFloat(input.value) || 0;
            }
        }
    }
    
    return settings;
}

async function saveSettings() {
    try {
        const settings = getFormValues();
        
        const response = await fetch('/api/scoring', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            scoringSettings = settings;
            setCachedData(CACHE_KEYS.SCORING, settings);
            showStatus('Settings saved successfully!', 'success');
        } else {
            showStatus('Error saving settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Error saving settings', 'error');
    }
}

async function recalculateVORP() {
    try {
        await saveSettings();
        
        localStorage.removeItem('fantasy_players_cache');
        
        showStatus('VORP recalculated! Redirecting to main page...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Error recalculating VORP:', error);
        showStatus('Error recalculating VORP', 'error');
    }
}

function resetToDefaults() {
    populateForm(defaultScoring);
    showStatus('Reset to default values (not saved yet)', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    loadScoringSettings();
    
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('recalculateVorp').addEventListener('click', recalculateVORP);
    document.getElementById('resetDefaults').addEventListener('click', resetToDefaults);
});