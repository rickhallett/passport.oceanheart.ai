-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create index for token lookups
CREATE INDEX idx_password_resets_token ON password_resets(token);

-- Create index for cleanup queries
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- Create index for user lookups
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);