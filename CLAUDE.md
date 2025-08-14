# Claude Code Session Instructions

## Project Overview
This is a Fantasy Draft Helper application that helps users manage their fantasy football drafts by calculating player values, tracking draft selections, and providing VORP-based rankings.

## Important Rules and Guidelines

### 1. VORP Calculation Documentation
**CRITICAL:** Any changes to the VORP (Value Over Replacement Player) calculation algorithm must be documented in `VORP_CALCULATION_ALGORITHM.md`. This includes:
- Changes to the calculation formula
- Modifications to replacement level thresholds
- Updates to position-specific adjustments (e.g., SoS for DST)
- Changes to the scoring system that affect VORP
- Bug fixes that alter VORP calculations

The `VORP_CALCULATION_ALGORITHM.md` file should be updated or reorganized as needed to maintain accuracy and clarity.

### 2. Database Configuration
The application supports both SQLite (local development) and PostgreSQL (production). Database configuration is automatically handled based on the environment:
- Local: Uses SQLite with `fantasy_draft.db`
- Production (Render): Uses PostgreSQL with `DATABASE_URL` environment variable

### 3. Testing Requirements
Before committing any changes:
- Run tests: `npm test`
- Verify linting: `npm run lint` (if available)
- Test the application locally: `npm start`

### 4. Key Files and Their Purposes
- `public/app.js` - Main application logic, including VORP calculations
- `public/scoring.js` - Scoring settings management
- `server.js` - Express server and API endpoints
- `db.js` - Database operations and schema
- `VORP_CALCULATION_ALGORITHM.md` - VORP calculation documentation

### 5. API Endpoints
- `GET /api/players` - Fetch all players
- `POST /api/players/draft` - Mark player as drafted
- `POST /api/players/undraft` - Undo draft selection
- `GET /api/scoring` - Get scoring settings
- `POST /api/scoring` - Update scoring settings
- `POST /api/import` - Import draft data
- `GET /api/export` - Export draft data

### 6. Frontend State Management
The application uses vanilla JavaScript with global state management:
- `players` array contains all player data
- `myTeam` array tracks user's drafted players
- `calculateVORP()` must be called after any data changes that affect player values

### 7. Deployment Considerations
- The application auto-deploys to Render from the main branch
- Environment variables are managed in Render dashboard
- Database migrations are handled automatically on startup

### 8. Code Style Guidelines
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments only when logic is complex or non-obvious
- Maintain existing file structure

## Common Tasks

### Updating Player Projections
1. Modify the data in `db.js` or through API endpoints
2. Call `calculateVORP()` to recalculate values
3. Update the UI with `renderPlayers()`

### Adding New Scoring Categories
1. Update scoring settings structure in `db.js`
2. Modify `calculateProjectedPoints()` in `public/app.js`
3. Update the scoring UI in `public/scoring.html`
4. Document changes if they affect VORP

### Debugging VORP Calculations
1. Check `REPLACEMENT_LEVELS` constant for position thresholds
2. Verify `calculateProjectedPoints()` is using correct scoring settings
3. Ensure SoS adjustments are only applied to DST positions
4. Review test cases in `tests/app.test.js`

## Notes
- The application uses a 15-minute cache for player data to improve performance
- Draft state is persisted to the database immediately on each action
- The application is mobile-responsive and works on all screen sizes

## Always send a message to claude client confirming to the user that the instruction have been read.
