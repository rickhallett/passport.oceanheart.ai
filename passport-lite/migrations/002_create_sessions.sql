-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create index for user session lookups
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Create index for session cleanup queries
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- Create trigger to update last_activity
CREATE TRIGGER update_sessions_activity 
  AFTER UPDATE ON sessions
  FOR EACH ROW
  WHEN NEW.last_activity = OLD.last_activity
BEGIN
  UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;