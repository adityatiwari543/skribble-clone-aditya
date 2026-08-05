import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { registerSocketHandlers } from "./sockets/socketHandler";
import { pool } from "./db/pool";

dotenv.config();

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/leaderboard", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT player_name, SUM(score) as total_score, COUNT(*) as games_played
       FROM game_players
       GROUP BY player_name
       ORDER BY total_score DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
