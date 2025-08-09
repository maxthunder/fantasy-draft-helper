let players = [];
let scoringSettings = {};
let currentPosition = 'ALL';
let myTeam = [];

const REPLACEMENT_LEVELS = {
    QB: 12,
    RB: 24,
    WR: 30,
    TE: 12,
    DST: 10
};

async function init() {
    await loadScoringSettings();
    await loadPlayers();
    calculateVORP();
    renderPlayers();
    setupEventListeners();
}

async function loadScoringSettings() {
    try {
        const response = await fetch('/api/scoring');
        scoringSettings = await response.json();
    } catch (error) {
        console.error('Error loading scoring settings:', error);
    }
}

async function loadPlayers() {
    try {
        const response = await fetch('/api/players');
        players = await response.json();
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function calculateVORP() {
    const positionGroups = {};
    
    players.forEach(player => {
        if (!positionGroups[player.position]) {
            positionGroups[player.position] = [];
        }
        positionGroups[player.position].push(player);
    });
    
    Object.keys(positionGroups).forEach(position => {
        const positionPlayers = positionGroups[position];
        positionPlayers.sort((a, b) => {
            const aPoints = a.stats2025?.projectedPoints || 0;
            const bPoints = b.stats2025?.projectedPoints || 0;
            return bPoints - aPoints;
        });
        
        const replacementLevel = REPLACEMENT_LEVELS[position] || 10;
        let replacementValue = 0;
        
        if (positionPlayers.length >= replacementLevel) {
            replacementValue = positionPlayers[replacementLevel - 1].stats2025?.projectedPoints || 0;
        } else if (positionPlayers.length > 0) {
            replacementValue = positionPlayers[positionPlayers.length - 1].stats2025?.projectedPoints || 0;
        }
        
        positionPlayers.forEach(player => {
            const playerPoints = player.stats2025?.projectedPoints || 0;
            player.vorp = Math.round((playerPoints - replacementValue) * 10) / 10;
        });
    });
    
    players.sort((a, b) => b.vorp - a.vorp);
}

function renderPlayers() {
    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = '';
    
    const filteredPlayers = currentPosition === 'ALL' 
        ? players 
        : players.filter(p => p.position === currentPosition);
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const searchedPlayers = searchTerm 
        ? filteredPlayers.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.team.toLowerCase().includes(searchTerm))
        : filteredPlayers;
    
    searchedPlayers.forEach(player => {
        const row = document.createElement('tr');
        if (player.isDrafted) row.classList.add('drafted');
        if (player.isMyTeam) row.classList.add('my-team');
        
        const stats2024 = formatStats(player.position, player.stats2024);
        const stats2025 = formatStats(player.position, player.stats2025);
        
        row.innerHTML = `
            <td><input type="checkbox" class="draft-checkbox" data-player-id="${player.id}" ${player.isDrafted ? 'checked' : ''}></td>
            <td><input type="checkbox" class="myteam-checkbox" data-player-id="${player.id}" ${player.isMyTeam ? 'checked' : ''}></td>
            <td class="player-name">${player.name}</td>
            <td>${player.position}</td>
            <td>${player.team}</td>
            <td class="vorp-value ${player.vorp < 0 ? 'negative' : ''}">${player.vorp}</td>
            <td>${player.adp}</td>
            <td>${player.stats2024?.fantasyPoints || '-'}</td>
            <td>${player.stats2025?.projectedPoints || '-'}</td>
            <td class="stats-detail">${stats2024}</td>
            <td class="stats-detail">${stats2025}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateMyTeamDisplay();
}

function formatStats(position, stats) {
    if (!stats) return '-';
    
    switch(position) {
        case 'QB':
            return `${stats.passingYards || 0} Pass Yds, ${stats.passingTDs || 0} TDs, ${stats.rushingYards || 0} Rush`;
        case 'RB':
            return `${stats.rushingYards || 0} Rush, ${stats.rushingTDs || 0} TDs, ${stats.receptions || 0} Rec`;
        case 'WR':
        case 'TE':
            return `${stats.receptions || 0} Rec, ${stats.receivingYards || 0} Yds, ${stats.receivingTDs || 0} TDs`;
        case 'DST':
            return `${stats.sacks || 0} Sacks, ${stats.interceptions || 0} INTs`;
        default:
            return '-';
    }
}

function updateMyTeamDisplay() {
    const myTeamPlayers = players.filter(p => p.isMyTeam);
    
    const qbs = myTeamPlayers.filter(p => p.position === 'QB');
    const rbs = myTeamPlayers.filter(p => p.position === 'RB');
    const wrs = myTeamPlayers.filter(p => p.position === 'WR');
    const tes = myTeamPlayers.filter(p => p.position === 'TE');
    const dsts = myTeamPlayers.filter(p => p.position === 'DST');
    
    updatePositionList('myQBs', qbs);
    updatePositionList('myRBs', rbs);
    updatePositionList('myWRs', wrs);
    updatePositionList('myTEs', tes);
    updatePositionList('myDST', dsts);
    
    document.getElementById('qbCount').textContent = qbs.length;
    document.getElementById('rbCount').textContent = rbs.length;
    document.getElementById('wrCount').textContent = wrs.length;
    document.getElementById('teCount').textContent = tes.length;
    document.getElementById('dstCount').textContent = dsts.length;
    
    const flexEligible = [...rbs, ...wrs, ...tes];
    const flexStarters = Math.min(3, Math.max(0, flexEligible.length - 2));
    document.getElementById('flexCount').textContent = flexStarters;
    
    updateFlexList(flexEligible);
    
    const totalVorp = myTeamPlayers.reduce((sum, p) => sum + (p.vorp || 0), 0);
    const totalProjected = myTeamPlayers.reduce((sum, p) => sum + (p.stats2025?.projectedPoints || 0), 0);
    
    document.getElementById('teamVorp').textContent = Math.round(totalVorp * 10) / 10;
    document.getElementById('teamProjectedPoints').textContent = Math.round(totalProjected);
}

function updatePositionList(elementId, players) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    
    players.sort((a, b) => b.vorp - a.vorp).forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-info">${player.name} (${player.team})</span>
            <span class="player-vorp">VORP: ${player.vorp}</span>
        `;
        list.appendChild(li);
    });
}

function updateFlexList(flexEligible) {
    const list = document.getElementById('myFlex');
    list.innerHTML = '';
    
    const requiredStarters = {
        RB: 1,
        WR: 1,
        TE: 1
    };
    
    const startersByPosition = {
        RB: [],
        WR: [],
        TE: []
    };
    
    flexEligible.sort((a, b) => b.vorp - a.vorp);
    
    flexEligible.forEach(player => {
        if (startersByPosition[player.position].length < requiredStarters[player.position]) {
            startersByPosition[player.position].push(player);
        }
    });
    
    const starters = [...startersByPosition.RB, ...startersByPosition.WR, ...startersByPosition.TE];
    const remainingPlayers = flexEligible.filter(p => !starters.includes(p));
    
    const flexPlayers = remainingPlayers.slice(0, 3);
    
    flexPlayers.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-info">${player.name} (${player.position}-${player.team})</span>
            <span class="player-vorp">VORP: ${player.vorp}</span>
        `;
        list.appendChild(li);
    });
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPosition = e.target.dataset.position;
            renderPlayers();
        });
    });
    
    document.getElementById('searchInput').addEventListener('input', renderPlayers);
    
    document.getElementById('refreshVorp').addEventListener('click', () => {
        calculateVORP();
        renderPlayers();
    });
    
    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('draft-checkbox')) {
            const playerId = e.target.dataset.playerId;
            const player = players.find(p => p.id === playerId);
            if (player) {
                player.isDrafted = e.target.checked;
                await updatePlayer(playerId, 'isDrafted', e.target.checked);
                renderPlayers();
            }
        }
        
        if (e.target.classList.contains('myteam-checkbox')) {
            const playerId = e.target.dataset.playerId;
            const player = players.find(p => p.id === playerId);
            if (player) {
                player.isMyTeam = e.target.checked;
                if (e.target.checked) {
                    player.isDrafted = true;
                }
                await updatePlayer(playerId, 'isMyTeam', e.target.checked);
                if (e.target.checked) {
                    await updatePlayer(playerId, 'isDrafted', true);
                }
                renderPlayers();
            }
        }
    });
}

async function updatePlayer(playerId, field, value) {
    try {
        await fetch('/api/players/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playerId, field, value })
        });
    } catch (error) {
        console.error('Error updating player:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);