-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Create index on created_at for cleanup queries
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- Create updated_at trigger for sessions
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE
    ON sessions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();