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

const CACHE_KEYS = {
    PLAYERS: 'fantasy_players_cache',
    SCORING: 'fantasy_scoring_cache'
};

const CACHE_DURATION = 5 * 60 * 1000;

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

function invalidateCache(key) {
    try {
        if (key) {
            localStorage.removeItem(key);
            console.log(`Cache invalidated for ${key}`);
        } else {
            Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k));
            console.log('All cache invalidated');
        }
    } catch (error) {
        console.error('Error invalidating cache:', error);
    }
}

async function init() {
    await loadScoringSettings();
    await loadPlayers();
    calculateVORP();
    renderPlayers();
    setupEventListeners();
}

async function loadScoringSettings() {
    try {
        const cachedData = getCachedData(CACHE_KEYS.SCORING);
        if (cachedData) {
            scoringSettings = cachedData;
            return;
        }
        
        const response = await fetch('/api/scoring');
        scoringSettings = await response.json();
        setCachedData(CACHE_KEYS.SCORING, scoringSettings);
    } catch (error) {
        console.error('Error loading scoring settings:', error);
    }
}

async function loadPlayers() {
    try {
        const cachedData = getCachedData(CACHE_KEYS.PLAYERS);
        if (cachedData) {
            players = cachedData;
            return;
        }
        
        const response = await fetch('/api/players');
        players = await response.json();
        setCachedData(CACHE_KEYS.PLAYERS, players);
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function calculateProjectedPoints(player) {
    const stats = player.stats2025;
    if (!stats) return 0;
    
    let points = 0;
    
    if (player.position === 'QB') {
        points += (stats.passingYards || 0) * scoringSettings.passing.yards;
        points += (stats.passingTDs || 0) * scoringSettings.passing.touchdowns;
        points += (stats.interceptions || 0) * scoringSettings.passing.interceptions;
        points += (stats.rushingYards || 0) * scoringSettings.rushing.yards;
        points += (stats.rushingTDs || 0) * scoringSettings.rushing.touchdowns;
    } else if (player.position === 'RB') {
        points += (stats.rushingYards || 0) * scoringSettings.rushing.yards;
        points += (stats.rushingTDs || 0) * scoringSettings.rushing.touchdowns;
        points += (stats.receptions || 0) * scoringSettings.receiving.receptions;
        points += (stats.receivingYards || 0) * scoringSettings.receiving.yards;
        points += (stats.receivingTDs || 0) * scoringSettings.receiving.touchdowns;
    } else if (player.position === 'WR' || player.position === 'TE') {
        points += (stats.receptions || 0) * scoringSettings.receiving.receptions;
        points += (stats.receivingYards || 0) * scoringSettings.receiving.yards;
        points += (stats.receivingTDs || 0) * scoringSettings.receiving.touchdowns;
        points += (stats.rushingYards || 0) * scoringSettings.rushing.yards;
        points += (stats.rushingTDs || 0) * scoringSettings.rushing.touchdowns;
    } else if (player.position === 'DST') {
        points = stats.projectedPoints || 0;
    }
    
    return points;
}

function calculateVORP() {
    players.forEach(player => {
        player.calculatedPoints = calculateProjectedPoints(player);
        
        // Apply SoS adjustment for DST
        if (player.position === 'DST' && player.strengthOfSchedule) {
            // SoS ranges from ~0.8 (easy) to ~1.2 (hard)
            // Lower SoS means easier schedule, which is better for DST
            // So we invert the adjustment: easier schedule (lower SoS) gets a boost
            const sosAdjustment = 2 - player.strengthOfSchedule;
            player.calculatedPoints = player.calculatedPoints * sosAdjustment;
        }
    });
    
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
            const aPoints = a.calculatedPoints || 0;
            const bPoints = b.calculatedPoints || 0;
            return bPoints - aPoints;
        });
        
        const replacementLevel = REPLACEMENT_LEVELS[position] || 10;
        let replacementValue = 0;
        
        if (positionPlayers.length >= replacementLevel) {
            replacementValue = positionPlayers[replacementLevel - 1].calculatedPoints || 0;
        } else if (positionPlayers.length > 0) {
            replacementValue = positionPlayers[positionPlayers.length - 1].calculatedPoints || 0;
        }
        
        positionPlayers.forEach(player => {
            const playerPoints = player.calculatedPoints || 0;
            player.vorp = Math.round((playerPoints - replacementValue) * 10) / 10;
        });
    });
    
    players.sort((a, b) => b.vorp - a.vorp);
}

function renderPlayers() {
    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = '';
    
    let filteredPlayers;
    if (currentPosition === 'ALL') {
        filteredPlayers = players;
    } else if (currentPosition === 'FLEX') {
        filteredPlayers = players.filter(p => 
            p.position === 'WR' || p.position === 'RB' || p.position === 'TE'
        );
    } else {
        filteredPlayers = players.filter(p => p.position === currentPosition);
    }
    
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
        
        const stats2024 = formatStats(player.position, player.stats2024, player, false);
        const stats2025 = formatStats(player.position, player.stats2025, player, true);
        
        const vorpDisplay = player.position === 'DST' && player.strengthOfSchedule 
            ? `<span title="SoS-adjusted VORP (SoS: ${player.strengthOfSchedule.toFixed(2)})">${player.vorp}</span>`
            : player.vorp;
            
        row.innerHTML = `
            <td><input type="checkbox" class="draft-checkbox" data-player-id="${player.id}" ${player.isDrafted ? 'checked' : ''}></td>
            <td><input type="checkbox" class="myteam-checkbox" data-player-id="${player.id}" ${player.isMyTeam ? 'checked' : ''}></td>
            <td class="player-name">${player.fantasyDataUrl ? `<a href="${player.fantasyDataUrl}" target="_blank" rel="noopener noreferrer">${player.name}</a>` : player.name}</td>
            <td>${player.position}</td>
            <td>${player.team}</td>
            <td class="vorp-value ${player.vorp < 0 ? 'negative' : ''}">${vorpDisplay}</td>
            <td>${player.adp}</td>
            <td>${player.stats2024?.fantasyPoints || '-'}</td>
            <td>${Math.round(player.calculatedPoints) || '-'}</td>
            <td class="stats-detail">${stats2024}</td>
            <td class="stats-detail stats-2025">${stats2025}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateMyTeamDisplay();
}

function formatStats(position, stats, player, is2025 = false) {
    if (!stats) return '-';
    
    if (is2025 && player.stats2024) {
        return formatStatsWithComparison(position, stats, player.stats2024, player);
    }
    
    switch(position) {
        case 'QB':
            return `${stats.passingYards || 0} Pass Yds, ${stats.passingTDs || 0} TDs, ${stats.rushingYards || 0} Rush`;
        case 'RB':
            return `${stats.rushingYards || 0} Rush, ${stats.rushingTDs || 0} TDs, ${stats.receptions || 0} Rec`;
        case 'WR':
        case 'TE':
            return `${stats.receptions || 0} Rec, ${stats.receivingYards || 0} Yds, ${stats.receivingTDs || 0} TDs`;
        case 'DST':
            let dstStats = `${stats.sacks || 0} Sacks, ${stats.interceptions || 0} INTs`;
            if (player && player.strengthOfSchedule) {
                const sosRating = player.strengthOfSchedule < 0.9 ? '🟢 Easy' : 
                                  player.strengthOfSchedule < 1.0 ? '🟡 Moderate' : 
                                  player.strengthOfSchedule < 1.1 ? '🟠 Hard' : '🔴 Very Hard';
                dstStats += ` | SoS: ${sosRating}`;
            }
            return dstStats;
        default:
            return '-';
    }
}

function formatStatsWithComparison(position, stats2025, stats2024, player) {
    const getStatClass = (val2025, val2024) => {
        if (!val2024 || val2024 === 0) return '';
        const percentChange = ((val2025 - val2024) / val2024) * 100;
        if (percentChange > 5) return 'stat-improved';
        if (percentChange < -5) return 'stat-declined';
        return 'stat-neutral';
    };
    
    const formatStat = (value, className) => {
        if (className) {
            return `<span class="${className}">${value}</span>`;
        }
        return value;
    };
    
    switch(position) {
        case 'QB': {
            const passYardsClass = getStatClass(stats2025.passingYards || 0, stats2024.passingYards || 0);
            const passTDsClass = getStatClass(stats2025.passingTDs || 0, stats2024.passingTDs || 0);
            const rushYardsClass = getStatClass(stats2025.rushingYards || 0, stats2024.rushingYards || 0);
            
            return `${formatStat(stats2025.passingYards || 0, passYardsClass)} Pass Yds, ` +
                   `${formatStat(stats2025.passingTDs || 0, passTDsClass)} TDs, ` +
                   `${formatStat(stats2025.rushingYards || 0, rushYardsClass)} Rush`;
        }
        case 'RB': {
            const rushYardsClass = getStatClass(stats2025.rushingYards || 0, stats2024.rushingYards || 0);
            const rushTDsClass = getStatClass(stats2025.rushingTDs || 0, stats2024.rushingTDs || 0);
            const receptionsClass = getStatClass(stats2025.receptions || 0, stats2024.receptions || 0);
            
            return `${formatStat(stats2025.rushingYards || 0, rushYardsClass)} Rush, ` +
                   `${formatStat(stats2025.rushingTDs || 0, rushTDsClass)} TDs, ` +
                   `${formatStat(stats2025.receptions || 0, receptionsClass)} Rec`;
        }
        case 'WR':
        case 'TE': {
            const receptionsClass = getStatClass(stats2025.receptions || 0, stats2024.receptions || 0);
            const recYardsClass = getStatClass(stats2025.receivingYards || 0, stats2024.receivingYards || 0);
            const recTDsClass = getStatClass(stats2025.receivingTDs || 0, stats2024.receivingTDs || 0);
            
            return `${formatStat(stats2025.receptions || 0, receptionsClass)} Rec, ` +
                   `${formatStat(stats2025.receivingYards || 0, recYardsClass)} Yds, ` +
                   `${formatStat(stats2025.receivingTDs || 0, recTDsClass)} TDs`;
        }
        case 'DST': {
            const sacksClass = getStatClass(stats2025.sacks || 0, stats2024.sacks || 0);
            const intsClass = getStatClass(stats2025.interceptions || 0, stats2024.interceptions || 0);
            
            let dstStats = `${formatStat(stats2025.sacks || 0, sacksClass)} Sacks, ` +
                          `${formatStat(stats2025.interceptions || 0, intsClass)} INTs`;
            if (player && player.strengthOfSchedule) {
                const sosRating = player.strengthOfSchedule < 0.9 ? '🟢 Easy' : 
                                  player.strengthOfSchedule < 1.0 ? '🟡 Moderate' : 
                                  player.strengthOfSchedule < 1.1 ? '🟠 Hard' : '🔴 Very Hard';
                dstStats += ` | SoS: ${sosRating}`;
            }
            return dstStats;
        }
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
    const totalProjected = myTeamPlayers.reduce((sum, p) => sum + (p.calculatedPoints || 0), 0);
    
    document.getElementById('teamVorp').textContent = Math.round(totalVorp * 10) / 10;
    document.getElementById('teamProjectedPoints').textContent = Math.round(totalProjected);
}

function updatePositionList(elementId, players) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    
    players.sort((a, b) => b.vorp - a.vorp).forEach(player => {
        const li = document.createElement('li');
        const playerName = player.fantasyDataUrl 
            ? `<a href="${player.fantasyDataUrl}" target="_blank" rel="noopener noreferrer">${player.name}</a>` 
            : player.name;
        li.innerHTML = `
            <span class="player-info">${playerName} (${player.team})</span>
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
        const playerName = player.fantasyDataUrl 
            ? `<a href="${player.fantasyDataUrl}" target="_blank" rel="noopener noreferrer">${player.name}</a>` 
            : player.name;
        li.innerHTML = `
            <span class="player-info">${playerName} (${player.position}-${player.team})</span>
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
            
            // Show/hide SoS legend for DST tab
            const sosLegend = document.getElementById('sosLegend');
            if (currentPosition === 'DST') {
                sosLegend.style.display = 'block';
            } else {
                sosLegend.style.display = 'none';
            }
            
            renderPlayers();
        });
    });
    
    document.getElementById('searchInput').addEventListener('input', renderPlayers);
    
    document.getElementById('refreshVorp').addEventListener('click', () => {
        calculateVORP();
        renderPlayers();
    });
    
    document.getElementById('clearCache').addEventListener('click', () => {
        invalidateCache();
        alert('Cache cleared! Data will be refreshed on next load.');
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
        const response = await fetch('/api/players/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playerId, field, value })
        });
        
        if (response.ok) {
            invalidateCache(CACHE_KEYS.PLAYERS);
        }
    } catch (error) {
        console.error('Error updating player:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);