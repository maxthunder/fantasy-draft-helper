// Mock DOM before requiring app
global.document = {
  getElementById: jest.fn(() => ({
    innerHTML: '',
    value: '',
    textContent: '',
    style: { display: 'none' },
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  })),
  createElement: jest.fn(() => ({
    innerHTML: '',
    appendChild: jest.fn(),
    classList: {
      add: jest.fn()
    }
  })),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn()
};

// Import the app functions
const {
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
} = require('../public/app.js');

describe('Fantasy Draft Helper - Core Functions', () => {
  
  beforeEach(() => {
    // Reset global variables needed by app functions
    global.players = [];
    global.scoringSettings = {};
  });

  describe('Cache Functions', () => {
    test('getCachedData returns null when no cache exists', () => {
      localStorage.getItem.mockReturnValue(null);
      const result = getCachedData('test_key');
      expect(result).toBeNull();
    });

    test('getCachedData returns data when cache is valid', () => {
      const testData = { name: 'Test Player' };
      const cacheEntry = {
        data: testData,
        timestamp: Date.now() - 1000 // 1 second ago
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(cacheEntry));
      
      const result = getCachedData('test_key');
      expect(result).toEqual(testData);
    });

    test('getCachedData returns null when cache is expired', () => {
      const testData = { name: 'Test Player' };
      const cacheEntry = {
        data: testData,
        timestamp: Date.now() - (10 * 60 * 1000) // 10 minutes ago
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(cacheEntry));
      
      const result = getCachedData('test_key');
      expect(result).toBeNull();
    });

    test('setCachedData stores data with timestamp', () => {
      const testData = { name: 'Test Player' };
      setCachedData('test_key', testData);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'test_key',
        expect.stringContaining('"name":"Test Player"')
      );
    });

    test('invalidateCache removes specific key', () => {
      invalidateCache('test_key');
      expect(localStorage.removeItem).toHaveBeenCalledWith('test_key');
    });

    test('invalidateCache removes all keys when no key specified', () => {
      invalidateCache();
      expect(localStorage.removeItem).toHaveBeenCalledWith('fantasy_players_cache');
      expect(localStorage.removeItem).toHaveBeenCalledWith('fantasy_scoring_cache');
    });
  });

  describe('Scoring Calculations', () => {
    beforeEach(() => {
      // Set up scoring settings
      global.scoringSettings = {
        passing: {
          yards: 0.04,
          touchdowns: 4,
          interceptions: -2
        },
        rushing: {
          yards: 0.1,
          touchdowns: 6
        },
        receiving: {
          receptions: 0.5,
          yards: 0.1,
          touchdowns: 6
        }
      };
    });

    test('calculateProjectedPoints for QB', () => {
      const qbPlayer = {
        position: 'QB',
        projectedStats2025: {
          passingYards: 4000,
          passingTDs: 30,
          interceptions: 10,
          rushingYards: 300,
          rushingTDs: 3
        }
      };
      
      const points = calculateProjectedPoints(qbPlayer);
      // 4000 * 0.04 + 30 * 4 + 10 * -2 + 300 * 0.1 + 3 * 6
      // 160 + 120 - 20 + 30 + 18 = 308
      expect(points).toBe(308);
    });

    test('calculateProjectedPoints for RB', () => {
      const rbPlayer = {
        position: 'RB',
        projectedStats2025: {
          rushingYards: 1200,
          rushingTDs: 10,
          receptions: 50,
          receivingYards: 400,
          receivingTDs: 3
        }
      };
      
      const points = calculateProjectedPoints(rbPlayer);
      // 1200 * 0.1 + 10 * 6 + 50 * 0.5 + 400 * 0.1 + 3 * 6
      // 120 + 60 + 25 + 40 + 18 = 263
      expect(points).toBe(263);
    });

    test('calculateProjectedPoints for WR', () => {
      const wrPlayer = {
        position: 'WR',
        projectedStats2025: {
          receptions: 80,
          receivingYards: 1100,
          receivingTDs: 8,
          rushingYards: 50,
          rushingTDs: 0
        }
      };
      
      const points = calculateProjectedPoints(wrPlayer);
      // 80 * 0.5 + 1100 * 0.1 + 8 * 6 + 50 * 0.1 + 0 * 6
      // 40 + 110 + 48 + 5 + 0 = 203
      expect(points).toBe(203);
    });

    test('calculateProjectedPoints for DST', () => {
      const dstPlayer = {
        position: 'DST',
        projectedStats2025: {
          projectedPoints: 120
        }
      };
      
      const points = calculateProjectedPoints(dstPlayer);
      expect(points).toBe(120);
    });

    test('calculateProjectedPoints handles missing stats', () => {
      const player = {
        position: 'RB',
        projectedStats2025: null
      };
      
      const points = calculateProjectedPoints(player);
      expect(points).toBe(0);
    });
  });

  describe('VORP Calculations', () => {
    test('calculateVORP calculates value over replacement player', () => {
      global.players = [
        { id: 'qb1', position: 'QB', projectedStats2025: { passingYards: 4500, passingTDs: 35, interceptions: 8 } },
        { id: 'qb2', position: 'QB', projectedStats2025: { passingYards: 4200, passingTDs: 32, interceptions: 10 } },
        { id: 'qb3', position: 'QB', projectedStats2025: { passingYards: 4000, passingTDs: 30, interceptions: 12 } },
        { id: 'rb1', position: 'RB', projectedStats2025: { rushingYards: 1500, rushingTDs: 12 } },
        { id: 'rb2', position: 'RB', projectedStats2025: { rushingYards: 1200, rushingTDs: 10 } }
      ];
      
      global.scoringSettings = {
        passing: { yards: 0.04, touchdowns: 4, interceptions: -2 },
        rushing: { yards: 0.1, touchdowns: 6 },
        receiving: { receptions: 0.5, yards: 0.1, touchdowns: 6 }
      };
      
      calculateVORP();
      
      // Check that VORP was calculated
      expect(global.players[0].vorp).toBeDefined();
      expect(global.players[0].calculatedPoints).toBeDefined();
      
      // QB1 should have highest VORP among QBs
      const qbs = global.players.filter(p => p.position === 'QB');
      const qbVorps = qbs.map(p => p.vorp);
      expect(qbVorps[0]).toBeGreaterThan(qbVorps[1]);
      expect(qbVorps[1]).toBeGreaterThan(qbVorps[2]);
    });

    test('calculateVORP applies SoS adjustment for DST', () => {
      global.players = [
        { 
          id: 'dst1', 
          position: 'DST', 
          projectedStats2025: { projectedPoints: 100 },
          strengthOfSchedule: 0.8 // Easy schedule
        },
        { 
          id: 'dst2', 
          position: 'DST', 
          projectedStats2025: { projectedPoints: 100 },
          strengthOfSchedule: 1.2 // Hard schedule
        }
      ];
      
      global.scoringSettings = {
        passing: { yards: 0.04, touchdowns: 4, interceptions: -2 },
        rushing: { yards: 0.1, touchdowns: 6 },
        receiving: { receptions: 0.5, yards: 0.1, touchdowns: 6 }
      };
      
      calculateVORP();
      
      // DST with easier schedule should have higher adjusted points
      expect(global.players[0].calculatedPoints).toBeGreaterThan(global.players[1].calculatedPoints);
    });
  });

  describe('Stats Formatting', () => {
    test('formatStats for QB without comparison', () => {
      const player = {
        position: 'QB',
        stats2024: {
          passingYards: 3800,
          passingTDs: 28,
          rushingYards: 250
        }
      };
      
      const formatted = formatStats('QB', player.stats2024, player, false);
      expect(formatted).toBe('3800 Pass Yds, 28 TDs, 250 Rush');
    });

    test('formatStats for RB without comparison', () => {
      const player = {
        position: 'RB',
        stats2024: {
          rushingYards: 1200,
          rushingTDs: 10,
          receptions: 40
        }
      };
      
      const formatted = formatStats('RB', player.stats2024, player, false);
      expect(formatted).toBe('1200 Rush, 10 TDs, 40 Rec');
    });

    test('formatStats for WR without comparison', () => {
      const player = {
        position: 'WR',
        stats2024: {
          receptions: 75,
          receivingYards: 1000,
          receivingTDs: 8
        }
      };
      
      const formatted = formatStats('WR', player.stats2024, player, false);
      expect(formatted).toBe('75 Rec, 1000 Yds, 8 TDs');
    });

    test('formatStats handles missing stats', () => {
      const player = {
        position: 'QB',
        stats2024: null
      };
      
      const formatted = formatStats('QB', null, player, false);
      expect(formatted).toBe('-');
    });

    test('formatStatsWithComparison shows improvements in green', () => {
      const player = {
        position: 'QB',
        stats2024: {
          passingYards: 3800,
          passingTDs: 28,
          rushingYards: 250
        },
        projectedStats2025: {
          passingYards: 4200, // +10.5% improvement
          passingTDs: 32,     // +14.3% improvement
          rushingYards: 280   // +12% improvement
        }
      };
      
      const formatted = formatStatsWithComparison('QB', player.stats2025, player.stats2024, player);
      
      // Check for stat-improved class
      expect(formatted).toContain('class="stat-improved"');
      expect(formatted).toContain('>4200</span>');
      expect(formatted).toContain('>32</span>');
      expect(formatted).toContain('>280</span>');
    });

    test('formatStatsWithComparison shows declines in red', () => {
      const player = {
        position: 'RB',
        stats2024: {
          rushingYards: 1200,
          rushingTDs: 10,
          receptions: 50
        },
        projectedStats2025: {
          rushingYards: 1000, // -16.7% decline
          rushingTDs: 8,      // -20% decline
          receptions: 40      // -20% decline
        }
      };
      
      const formatted = formatStatsWithComparison('RB', player.stats2025, player.stats2024, player);
      
      // Check for stat-declined class
      expect(formatted).toContain('class="stat-declined"');
      expect(formatted).toContain('>1000</span>');
      expect(formatted).toContain('>8</span>');
      expect(formatted).toContain('>40</span>');
    });

    test('formatStatsWithComparison shows neutral changes in yellow', () => {
      const player = {
        position: 'WR',
        stats2024: {
          receptions: 80,
          receivingYards: 1000,
          receivingTDs: 8
        },
        projectedStats2025: {
          receptions: 82,     // +2.5% neutral
          receivingYards: 1030, // +3% neutral
          receivingTDs: 8      // 0% neutral
        }
      };
      
      const formatted = formatStatsWithComparison('WR', player.stats2025, player.stats2024, player);
      
      // Check for stat-neutral class
      expect(formatted).toContain('class="stat-neutral"');
    });

    test('formatStats for DST includes SoS rating', () => {
      const player = {
        position: 'DST',
        stats2024: {
          sacks: 40,
          interceptions: 15
        },
        strengthOfSchedule: 0.85
      };
      
      const formatted = formatStats('DST', player.stats2024, player, false);
      expect(formatted).toContain('40 Sacks, 15 INTs');
      expect(formatted).toContain('SoS:');
      expect(formatted).toContain('Easy');
    });
  });
});