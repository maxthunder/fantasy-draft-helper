let positionRequirements = {};


async function loadPositionRequirements() {
    try {
        // Load from server
        const response = await fetch('/api/position-requirements');
        if (response.ok) {
            positionRequirements = await response.json();
            updateUI();
        } else {
            loadDefaults();
        }
    } catch (error) {
        console.error('Error loading position requirements:', error);
        loadDefaults();
    }
}

function loadDefaults() {
    positionRequirements = {
        QB: { min: 1, max: 3 },
        RB: { min: 2, max: 6 },
        WR: { min: 2, max: 6 },
        TE: { min: 1, max: 3 },
        K: { min: 1, max: 1 },
        DST: { min: 1, max: 2 },
        flex: { count: 1, superflex: false },
        bench: 6
    };
    updateUI();
}

function updateUI() {
    document.getElementById('qb-min').value = positionRequirements.QB?.min || 1;
    document.getElementById('qb-max').value = positionRequirements.QB?.max || 3;
    document.getElementById('rb-min').value = positionRequirements.RB?.min || 2;
    document.getElementById('rb-max').value = positionRequirements.RB?.max || 6;
    document.getElementById('wr-min').value = positionRequirements.WR?.min || 2;
    document.getElementById('wr-max').value = positionRequirements.WR?.max || 6;
    document.getElementById('te-min').value = positionRequirements.TE?.min || 1;
    document.getElementById('te-max').value = positionRequirements.TE?.max || 3;
    document.getElementById('k-min').value = positionRequirements.K?.min || 1;
    document.getElementById('k-max').value = positionRequirements.K?.max || 1;
    document.getElementById('dst-min').value = positionRequirements.DST?.min || 1;
    document.getElementById('dst-max').value = positionRequirements.DST?.max || 2;
    document.getElementById('flex-count').value = positionRequirements.flex?.count || 1;
    document.getElementById('superflex').checked = positionRequirements.flex?.superflex || false;
    document.getElementById('bench-spots').value = positionRequirements.bench || 6;
}

async function savePositionRequirements() {
    const requirements = {
        QB: {
            min: parseInt(document.getElementById('qb-min').value),
            max: parseInt(document.getElementById('qb-max').value)
        },
        RB: {
            min: parseInt(document.getElementById('rb-min').value),
            max: parseInt(document.getElementById('rb-max').value)
        },
        WR: {
            min: parseInt(document.getElementById('wr-min').value),
            max: parseInt(document.getElementById('wr-max').value)
        },
        TE: {
            min: parseInt(document.getElementById('te-min').value),
            max: parseInt(document.getElementById('te-max').value)
        },
        K: {
            min: parseInt(document.getElementById('k-min').value),
            max: parseInt(document.getElementById('k-max').value)
        },
        DST: {
            min: parseInt(document.getElementById('dst-min').value),
            max: parseInt(document.getElementById('dst-max').value)
        },
        flex: {
            count: parseInt(document.getElementById('flex-count').value),
            superflex: document.getElementById('superflex').checked
        },
        bench: parseInt(document.getElementById('bench-spots').value)
    };
    
    if (!validateRequirements(requirements)) {
        return;
    }
    
    try {
        const response = await fetch('/api/position-requirements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requirements)
        });
        
        if (response.ok) {
            showMessage('Position requirements saved successfully!', 'success');
            positionRequirements = requirements;
        } else {
            showMessage('Error saving position requirements', 'error');
        }
    } catch (error) {
        console.error('Error saving position requirements:', error);
        showMessage('Error saving position requirements', 'error');
    }
}

function validateRequirements(requirements) {
    for (const [position, limits] of Object.entries(requirements)) {
        if (position === 'flex' || position === 'bench') continue;
        
        if (limits.min > limits.max) {
            showMessage(`${position}: Minimum cannot be greater than maximum`, 'error');
            return false;
        }
        
        if (limits.min < 0 || limits.max < 0) {
            showMessage(`${position}: Values must be non-negative`, 'error');
            return false;
        }
    }
    
    const totalMin = Object.entries(requirements)
        .filter(([key]) => !['flex', 'bench'].includes(key))
        .reduce((sum, [, limits]) => sum + limits.min, 0);
    
    const totalWithFlex = totalMin + requirements.flex.count;
    const totalRosterSpots = totalWithFlex + requirements.bench;
    
    if (totalRosterSpots > 30) {
        showMessage('Total roster size exceeds 30 players', 'error');
        return false;
    }
    
    return true;
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}


document.addEventListener('DOMContentLoaded', loadPositionRequirements);