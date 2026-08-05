## 1. Backend setup

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```
PORT=4000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skribbl_clone
DB_SSL=false
```
(if using a hosted DB from step 1B, paste that URL and set `DB_SSL=true`)

```bash
npm install
npm run db:init      # creates tables + seeds word list — run once
npm run dev           # starts server on http://localhost:4000
```

Verify it's alive (new terminal):
```bash
curl http://localhost:4000/health
# {"status":"ok","uptime":...}
```

---

## 3. Frontend setup

```bash
cd client
cp .env.example .env
```

Edit `.env`:
```
VITE_SERVER_URL=http://localhost:4000
```

```bash
npm install
npm run dev            # starts on http://localhost:5173
```


## Quick reference — all commands in one block

```bash
# Backend
cd server && cp .env.example .env   # edit DATABASE_URL first
npm install
npm run db:init
npm run dev

# Frontend (separate terminal)
cd client && cp .env.example .env   # edit VITE_SERVER_URL
npm install
npm run dev

