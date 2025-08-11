-- Fantasy Draft Helper Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS scoring_settings CASCADE;
DROP TABLE IF EXISTS position_requirements CASCADE;

-- Create players table
CREATE TABLE players (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(10) NOT NULL,
    team VARCHAR(10) NOT NULL,
    adp DECIMAL(5, 2),
    is_drafted BOOLEAN DEFAULT FALSE,
    is_my_team BOOLEAN DEFAULT FALSE,
    stats_2024 JSONB,
    projected_stats_2025 JSONB,
    fantasy_data_url TEXT,
    strength_of_schedule DECIMAL(4, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scoring settings table
CREATE TABLE scoring_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create position requirements table
CREATE TABLE position_requirements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    requirements JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_is_drafted ON players(is_drafted);
CREATE INDEX idx_players_is_my_team ON players(is_my_team);
CREATE INDEX idx_players_team ON players(team);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_settings_updated_at BEFORE UPDATE ON scoring_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_position_requirements_updated_at BEFORE UPDATE ON position_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default scoring settings
INSERT INTO scoring_settings (name, settings, is_active) VALUES (
    'default',
    '{
        "passing": {
            "yards": 0.04,
            "touchdowns": 4,
            "interceptions": -1,
            "twoPointConversions": 2
        },
        "rushing": {
            "yards": 0.1,
            "touchdowns": 6,
            "twoPointConversions": 2
        },
        "receiving": {
            "receptions": 1,
            "yards": 0.1,
            "touchdowns": 6,
            "twoPointConversions": 2
        },
        "defense": {
            "sacks": 1,
            "interceptions": 2,
            "fumblesRecovered": 2,
            "touchdowns": 6,
            "safeties": 2,
            "blockedKicks": 2,
            "pointsAllowed0": 10,
            "pointsAllowed1_6": 7,
            "pointsAllowed7_13": 4,
            "pointsAllowed14_20": 1,
            "pointsAllowed21_27": 0,
            "pointsAllowed28_34": -1,
            "pointsAllowed35Plus": -4
        }
    }'::jsonb,
    true
);

-- Insert default position requirements
INSERT INTO position_requirements (name, requirements, is_active) VALUES (
    'default',
    '{
        "QB": {"min": 1, "max": 3},
        "RB": {"min": 2, "max": 6},
        "WR": {"min": 2, "max": 6},
        "TE": {"min": 1, "max": 3},
        "K": {"min": 1, "max": 1},
        "DST": {"min": 1, "max": 2},
        "flex": {"count": 1, "superflex": false},
        "bench": 6
    }'::jsonb,
    true
);