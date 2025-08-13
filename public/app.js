let players = [];
let scoringSettings = {};
let positionRequirements = {};
let currentPosition = 'ALL';
let myTeam = [];

const REPLACEMENT_LEVELS = {
    QB: 12,
    RB: 24,
    WR: 30,
    TE: 12,
    DST: 10
};

// Removed all caching - data is now always fetched from database

async function init() {
    await loadScoringSettings();
    await loadPositionRequirements();
    await loadPlayers();
    calculateVORP();
    renderPlayers();
    setupEventListeners();
    // Ensure position needs display is updated on load
    updatePositionNeedsFromCurrentTeam();
}

async function loadScoringSettings() {
    try {
        const response = await fetch('/api/scoring');
        scoringSettings = await response.json();
    } catch (error) {
        console.error('Error loading scoring settings:', error);
    }
}

async function loadPositionRequirements() {
    try {
        const response = await fetch('/api/position-requirements');
        positionRequirements = await response.json();
    } catch (error) {
        console.error('Error loading position requirements:', error);
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

function calculateProjectedPoints(player) {
    const stats = player.projectedStats2025;
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
        const projectedStats2025 = formatStats(player.position, player.projectedStats2025, player, true);
        
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
            <td class="stats-detail stats-2025">${projectedStats2025}</td>
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

function formatStatsWithComparison(position, projectedStats2025, stats2024, player) {
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
            const passYardsClass = getStatClass(projectedStats2025.passingYards || 0, stats2024.passingYards || 0);
            const passTDsClass = getStatClass(projectedStats2025.passingTDs || 0, stats2024.passingTDs || 0);
            const rushYardsClass = getStatClass(projectedStats2025.rushingYards || 0, stats2024.rushingYards || 0);
            
            return `${formatStat(projectedStats2025.passingYards || 0, passYardsClass)} Pass Yds, ` +
                   `${formatStat(projectedStats2025.passingTDs || 0, passTDsClass)} TDs, ` +
                   `${formatStat(projectedStats2025.rushingYards || 0, rushYardsClass)} Rush`;
        }
        case 'RB': {
            const rushYardsClass = getStatClass(projectedStats2025.rushingYards || 0, stats2024.rushingYards || 0);
            const rushTDsClass = getStatClass(projectedStats2025.rushingTDs || 0, stats2024.rushingTDs || 0);
            const receptionsClass = getStatClass(projectedStats2025.receptions || 0, stats2024.receptions || 0);
            
            return `${formatStat(projectedStats2025.rushingYards || 0, rushYardsClass)} Rush, ` +
                   `${formatStat(projectedStats2025.rushingTDs || 0, rushTDsClass)} TDs, ` +
                   `${formatStat(projectedStats2025.receptions || 0, receptionsClass)} Rec`;
        }
        case 'WR':
        case 'TE': {
            const receptionsClass = getStatClass(projectedStats2025.receptions || 0, stats2024.receptions || 0);
            const recYardsClass = getStatClass(projectedStats2025.receivingYards || 0, stats2024.receivingYards || 0);
            const recTDsClass = getStatClass(projectedStats2025.receivingTDs || 0, stats2024.receivingTDs || 0);
            
            return `${formatStat(projectedStats2025.receptions || 0, receptionsClass)} Rec, ` +
                   `${formatStat(projectedStats2025.receivingYards || 0, recYardsClass)} Yds, ` +
                   `${formatStat(projectedStats2025.receivingTDs || 0, recTDsClass)} TDs`;
        }
        case 'DST': {
            const sacksClass = getStatClass(projectedStats2025.sacks || 0, stats2024.sacks || 0);
            const intsClass = getStatClass(projectedStats2025.interceptions || 0, stats2024.interceptions || 0);
            
            let dstStats = `${formatStat(projectedStats2025.sacks || 0, sacksClass)} Sacks, ` +
                          `${formatStat(projectedStats2025.interceptions || 0, intsClass)} INTs`;
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
    const ks = myTeamPlayers.filter(p => p.position === 'K');
    
    updatePositionList('myQBs', qbs);
    updatePositionList('myRBs', rbs);
    updatePositionList('myWRs', wrs);
    updatePositionList('myTEs', tes);
    updatePositionList('myDST', dsts);
    
    const positionCounts = {
        QB: qbs.length,
        RB: rbs.length,
        WR: wrs.length,
        TE: tes.length,
        DST: dsts.length,
        K: ks.length
    };
    
    document.getElementById('qbCount').textContent = `${qbs.length}/${positionRequirements.QB?.min || 1}-${positionRequirements.QB?.max || 3}`;
    document.getElementById('rbCount').textContent = `${rbs.length}/${positionRequirements.RB?.min || 2}-${positionRequirements.RB?.max || 6}`;
    document.getElementById('wrCount').textContent = `${wrs.length}/${positionRequirements.WR?.min || 2}-${positionRequirements.WR?.max || 6}`;
    document.getElementById('teCount').textContent = `${tes.length}/${positionRequirements.TE?.min || 1}-${positionRequirements.TE?.max || 3}`;
    document.getElementById('dstCount').textContent = `${dsts.length}/${positionRequirements.DST?.min || 1}-${positionRequirements.DST?.max || 2}`;
    
    updatePositionNeedsDisplay(positionCounts);
    
    const flexEligible = [...rbs, ...wrs, ...tes];
    const flexStarters = Math.min(3, Math.max(0, flexEligible.length - 2));
    document.getElementById('flexCount').textContent = flexStarters;
    
    updateFlexList(flexEligible);
    
    const totalVorp = myTeamPlayers.reduce((sum, p) => sum + (p.vorp || 0), 0);
    const totalProjected = myTeamPlayers.reduce((sum, p) => sum + (p.calculatedPoints || 0), 0);
    
    document.getElementById('teamVorp').textContent = Math.round(totalVorp * 10) / 10;
    document.getElementById('teamProjectedPoints').textContent = Math.round(totalProjected);
}

function updatePositionNeedsDisplay(positionCounts) {
    const needs = [];
    const filled = [];
    
    for (const [position, requirements] of Object.entries(positionRequirements)) {
        if (position === 'flex' || position === 'bench') continue;
        
        const count = positionCounts[position] || 0;
        if (count < requirements.min) {
            needs.push(`Need ${requirements.min - count} more ${position}`);
        } else {
            filled.push(`${position}: ${count}/${requirements.min}`);
        }
    }
    
    const needsElement = document.getElementById('teamNeeds');
    if (needsElement) {
        if (needs.length > 0) {
            needsElement.innerHTML = '<strong>Position Needs:</strong> ' + needs.join(', ');
            if (filled.length > 0) {
                needsElement.innerHTML += '<br><small style="color: #666;">Filled: ' + filled.join(', ') + '</small>';
            }
            needsElement.style.color = '#ff6b6b';
        } else {
            needsElement.innerHTML = '<strong>Position Requirements Met!</strong>';
            needsElement.innerHTML += '<br><small style="color: #666;">All positions filled: ' + filled.join(', ') + '</small>';
            needsElement.style.color = '#51cf66';
        }
    }
}

function updatePositionNeedsFromCurrentTeam() {
    const myTeamPlayers = players.filter(p => p.isMyTeam);
    
    const positionCounts = {
        QB: myTeamPlayers.filter(p => p.position === 'QB').length,
        RB: myTeamPlayers.filter(p => p.position === 'RB').length,
        WR: myTeamPlayers.filter(p => p.position === 'WR').length,
        TE: myTeamPlayers.filter(p => p.position === 'TE').length,
        DST: myTeamPlayers.filter(p => p.position === 'DST').length,
        K: myTeamPlayers.filter(p => p.position === 'K').length
    };
    
    updatePositionNeedsDisplay(positionCounts);
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
    
    // Export functionality
    document.getElementById('exportData').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/export');
            const data = await response.json();
            
            // Create a blob and download link
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fantasy-draft-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Draft data exported successfully!');
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export data');
        }
    });
    
    // Import functionality
    document.getElementById('importData').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (confirm('This will overwrite your current draft data. Continue?')) {
                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Data imported successfully!');
                    // Reload all data
                    await loadPlayers();
                    await loadScoringSettings();
                    await loadPositionRequirements();
                    calculateVORP();
                    renderPlayers();
                } else {
                    alert('Failed to import data');
                }
            }
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Invalid file format or import failed');
        }
        
        // Clear the file input
        e.target.value = '';
    });
    
    document.getElementById('resetDraft').addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all draft selections? This will uncheck all "Drafted" and "My Team" checkboxes.')) {
            try {
                // Collect all players that need to be reset
                const playersToReset = players.filter(p => p.isDrafted || p.isMyTeam);
                
                if (playersToReset.length === 0) {
                    return;
                }
                
                // Show progress
                const originalButtonText = document.getElementById('resetDraft').textContent;
                document.getElementById('resetDraft').textContent = 'Resetting...';
                document.getElementById('resetDraft').disabled = true;
                
                // Reset all players' draft status locally first for immediate UI feedback
                playersToReset.forEach(player => {
                    player.isDrafted = false;
                    player.isMyTeam = false;
                });
                
                // Re-render immediately for quick feedback
                renderPlayers();
                
                // Batch update on server
                const updatePromises = [];
                for (const player of playersToReset) {
                    updatePromises.push(
                        fetch('/api/players/update', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ 
                                playerId: player.id, 
                                field: 'isDrafted', 
                                value: false 
                            })
                        })
                    );
                    updatePromises.push(
                        fetch('/api/players/update', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ 
                                playerId: player.id, 
                                field: 'isMyTeam', 
                                value: false 
                            })
                        })
                    );
                }
                
                // Wait for all updates to complete
                await Promise.all(updatePromises);
                
                // Restore button
                document.getElementById('resetDraft').textContent = originalButtonText;
                document.getElementById('resetDraft').disabled = false;
                
            } catch (error) {
                console.error('Error resetting draft:', error);
                document.getElementById('resetDraft').textContent = 'Reset Draft';
                document.getElementById('resetDraft').disabled = false;
                alert('Error resetting draft. Please try again.');
            }
        }
    });
    
    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('draft-checkbox')) {
            const playerId = e.target.dataset.playerId;
            const player = players.find(p => p.id === playerId);
            if (player) {
                const isChecked = e.target.checked;
                player.isDrafted = isChecked;
                
                // If unchecking drafted, also uncheck my team
                if (!isChecked && player.isMyTeam) {
                    player.isMyTeam = false;
                    await updatePlayer(playerId, 'isMyTeam', false);
                }
                
                await updatePlayer(playerId, 'isDrafted', isChecked);
                renderPlayers();
            }
        }
        
        if (e.target.classList.contains('myteam-checkbox')) {
            const playerId = e.target.dataset.playerId;
            const player = players.find(p => p.id === playerId);
            if (player) {
                const isChecked = e.target.checked;
                player.isMyTeam = isChecked;
                
                if (isChecked) {
                    // If checking my team, also check drafted
                    player.isDrafted = true;
                    await updatePlayer(playerId, 'isDrafted', true);
                } else {
                    // If unchecking my team, also uncheck drafted
                    player.isDrafted = false;
                    await updatePlayer(playerId, 'isDrafted', false);
                }
                
                await updatePlayer(playerId, 'isMyTeam', isChecked);
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
        
        if (!response.ok) {
            console.error('Failed to update player');
        }
    } catch (error) {
        console.error('Error updating player:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCachedData,
    setCachedData,
    invalidateCache,
    calculateProjectedPoints,
    calculateVORP,
    formatStats,
    formatStatsWithComparison,
    REPLACEMENT_LEVELS,
    CACHE_KEYS,
    CACHE_DURATION
  };
}