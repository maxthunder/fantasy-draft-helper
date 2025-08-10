// Export functions for testing
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