# Couples Game — Express API Server

This is the backend Express.js API server for the Couples Scratch Game. It provides REST endpoints to manage text and image tasks, and stores uploaded images on disk.

## Tech Stack
- **Express.js** — Web framework
- **PostgreSQL** — Database
- **Drizzle ORM** — Type-safe SQL queries
- **Multer** — Image file uploads
- **TypeScript + tsx** — Runtime and type safety

---

## Prerequisites

You need a **PostgreSQL** database running. You have two options:

### Option A: Local PostgreSQL (Homebrew on Mac)
```bash
brew install postgresql@15
brew services start postgresql@15
createdb couples_game
```

### Option B: Free Cloud Database (Recommended for production)
Use [Supabase](https://supabase.com) or [Neon](https://neon.tech) — both have generous free tiers. Just copy the connection string they give you.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Edit .env and set your DATABASE_URL

# 3. Push the schema to the database (creates tables)
npm run db:push

# 4. Seed with all the existing tasks from the mobile app
npm run seed

# 5. Start the server in dev mode (auto-restarts on file changes)
npm run dev
```

The server starts on **http://localhost:4000**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/tasks/text` | Get all text tasks |
| GET | `/api/tasks/text/:id` | Get single text task |
| POST | `/api/tasks/text` | Create or update text task |
| DELETE | `/api/tasks/text/:id` | Delete text task |
| GET | `/api/tasks/image` | Get all image tasks |
| GET | `/api/tasks/image/:id` | Get single image task |
| POST | `/api/tasks/image` | Create/update image task (multipart/form-data with `image` file field) |
| DELETE | `/api/tasks/image/:id` | Delete image task (also removes image file from disk) |

### POST /api/tasks/text — Body (JSON)
```json
{
  "id": "t100",
  "title": "My New Task",
  "description": "Description here...",
  "timerSeconds": 60,
  "level": 1,
  "category": "romantic"
}
```

### POST /api/tasks/image — Body (multipart/form-data)
| Field | Type | Description |
|-------|------|-------------|
| `id` | text | e.g. `i100` |
| `caption` | text | Short caption for the image |
| `reactionPrompt` | text | What the couple should do after scratching |
| `level` | number | 1–5 |
| `image` | file | The image to upload (max 10MB) |

---

## Uploaded Images

Images are stored in `public/uploads/` and served publicly at `http://localhost:4000/uploads/filename.png`.
