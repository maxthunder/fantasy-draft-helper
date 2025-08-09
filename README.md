# Fantasy Football Draft Helper

A Node.js application to help you manage your fantasy football draft with VORP (Value Over Replacement Player) calculations.

## Features

- **Player Lists by Position**: View all players organized by position (QB, RB, WR, TE, DST)
- **VORP Calculations**: Automatically calculates each player's value over replacement based on projected 2025 stats
- **Draft Tracking**: Check off players as they get drafted
- **Team Building**: Select players for your team with a separate checkbox
- **My Team View**: See your selected team with position requirements:
  - 2 Quarterbacks
  - 1 Running Back (minimum)
  - 1 Wide Receiver (minimum) 
  - 1 Tight End (minimum)
  - 3 Flex positions (WR/RB/TE)
  - 1 Team Defense
- **Search Functionality**: Search for players by name or team
- **Stats Display**: View 2024 actual stats and 2025 projected stats for each player
- **Team Statistics**: Track your team's total VORP and projected points

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. **View Players**: Browse all available players sorted by VORP value
2. **Filter by Position**: Click position tabs (QB, RB, WR, TE, DST) to filter
3. **Mark Players as Drafted**: Check the "Drafted" checkbox when a player is selected by any team
4. **Build Your Team**: Check the "My Team" checkbox to add players to your roster
5. **Monitor Your Roster**: View your team composition in the right sidebar
6. **Search Players**: Use the search bar to find specific players

## Scoring Settings

The app uses PPR (Point Per Reception) scoring:
- **Passing**: 0.04 pts/yard, 4 pts/TD, -1 pt/INT
- **Rushing**: 0.1 pts/yard, 6 pts/TD
- **Receiving**: 1 pt/reception, 0.1 pts/yard, 6 pts/TD
- **Defense**: Various scoring for sacks, INTs, TDs, etc.

## VORP Calculation

VORP is calculated by comparing each player's projected points to the replacement level player at their position:
- QB: 12th ranked QB
- RB: 24th ranked RB
- WR: 30th ranked WR
- TE: 12th ranked TE
- DST: 10th ranked DST

## Data Management

Player selections are automatically saved to `data/players.json` and persist between sessions.