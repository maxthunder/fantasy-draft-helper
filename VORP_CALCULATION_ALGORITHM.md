# VORP Calculation Algorithm

## Overview
VORP (Value Over Replacement Player) is a metric that measures how many more fantasy points a player is projected to score compared to a replacement-level player at their position. This helps compare players across different positions on a common value scale.

## Algorithm Steps

### 1. Calculate Projected Points
Each player's projected fantasy points are calculated based on their projected statistics and the league's scoring settings.

**Location:** `public/app.js:98`

### 2. Apply Strength of Schedule (SoS) Adjustment
For DST (Defense/Special Teams) positions only, an adjustment is applied based on strength of schedule.

**Location:** `public/app.js:101-107`

- SoS ranges from approximately 0.8 (easy schedule) to 1.2 (hard schedule)
- For DST, easier schedules are advantageous, so the adjustment is inverted:
  ```javascript
  sosAdjustment = 2 - strengthOfSchedule
  adjustedPoints = basePoints × sosAdjustment
  ```
- This means a DST with an easy schedule (0.8 SoS) gets a 1.2x multiplier, while one with a hard schedule (1.2 SoS) gets a 0.8x multiplier

### 3. Group Players by Position
Players are organized into position groups (QB, RB, WR, TE, K, DST) for position-specific analysis.

**Location:** `public/app.js:110-117`

### 4. Sort Position Groups
Within each position group, players are sorted by their calculated points in descending order (highest to lowest).

**Location:** `public/app.js:121-125`

### 5. Determine Replacement Level
The replacement level is the baseline player at each position - the best player you could reasonably expect to find on waivers.

**Location:** `public/app.js:127-134`

**Replacement Level Thresholds:**
- **QB:** 12th best quarterback
- **RB:** 24th best running back
- **WR:** 36th best wide receiver
- **TE:** 12th best tight end
- **K:** 12th best kicker
- **DST:** 12th best defense/special teams

The replacement value is set to:
- The points of the player at the replacement rank (e.g., the 12th best QB's points)
- If fewer players exist than the threshold, the worst available player's points are used

### 6. Calculate VORP for Each Player
VORP is calculated as the difference between a player's projected points and the replacement level for their position.

**Location:** `public/app.js:136-139`

```
VORP = Player's Projected Points - Replacement Level Points
```

The result is rounded to one decimal place for display purposes.

### 7. Final Sorting
All players across all positions are sorted by their VORP values in descending order, creating a unified ranking that allows for cross-position comparison.

**Location:** `public/app.js:142`

## Interpretation

- **Positive VORP:** The player is projected to score more points than a replacement-level player at their position
- **Negative VORP:** The player is projected to score fewer points than a replacement-level player
- **Higher VORP:** More valuable player relative to replacement
- **VORP = 0:** Player is exactly at replacement level

## Example

If the 12th best QB is projected to score 250 points:
- A QB projected for 300 points would have a VORP of 50
- A QB projected for 240 points would have a VORP of -10

This allows you to compare this QB's value against players at other positions who also have their VORP calculated relative to their position's replacement level.

## Benefits of VORP

1. **Cross-position comparison:** Directly compare the value of a RB vs a WR vs a QB
2. **Draft strategy:** Identify which positions offer the most value above replacement
3. **Roster decisions:** Make informed decisions about which positions to prioritize
4. **Trade evaluation:** Compare players of different positions in potential trades

## File References

- **Main calculation:** `public/app.js:96-143` - `calculateVORP()` function
- **Replacement levels:** `public/app.js:7-14` - `REPLACEMENT_LEVELS` constant
- **Point calculation:** `public/app.js:calculateProjectedPoints()` function
- **Tests:** `tests/app.test.js:197-251` - VORP calculation tests