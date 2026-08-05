CREATE TABLE IF NOT EXISTS rooms (
  id            VARCHAR(12) PRIMARY KEY,         
  host_name     VARCHAR(50) NOT NULL,
  is_private    BOOLEAN NOT NULL DEFAULT true,
  max_players   INT NOT NULL DEFAULT 8,
  rounds        INT NOT NULL DEFAULT 3,
  draw_time     INT NOT NULL DEFAULT 80,
  word_count    INT NOT NULL DEFAULT 3,
  hints         INT NOT NULL DEFAULT 2,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  id            SERIAL PRIMARY KEY,
  room_id       VARCHAR(12) REFERENCES rooms(id) ON DELETE CASCADE,
  started_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMP,
  winner_name   VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS game_players (
  id            SERIAL PRIMARY KEY,
  game_id       INT REFERENCES games(id) ON DELETE CASCADE,
  player_name   VARCHAR(50) NOT NULL,
  score         INT NOT NULL DEFAULT 0,
  correct_guesses INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS words (
  id            SERIAL PRIMARY KEY,
  word          VARCHAR(50) NOT NULL UNIQUE,
  category      VARCHAR(30) NOT NULL DEFAULT 'general'
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
