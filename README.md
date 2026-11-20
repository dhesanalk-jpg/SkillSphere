<<<<<<< HEAD
# SkillSphere

**Your skills are your currency. Your community is your classroom.**

SkillSphere is a community skill exchange platform. Members list what they can teach and what they want to learn, discover reciprocal matches, find three-person circular exchanges, propose sessions and track learning progress — without money changing hands.

## Product features

- Skill DNA profiles with teaching skills, learning goals, proficiency, interests and availability.
- Reciprocal matching with explainable compatibility scores.
- SkillChain detection for circular three-person exchanges.
- TimeTwin availability overlap calculations.
- Search and skill-category discovery.
- Exchange booking, confirmation and completion workflows.
- Reviews and learning progress tracking.
- Responsive React interface.

## Technology

- Frontend: React, TypeScript, Vite and custom CSS.
- Backend: Python, FastAPI and SQLite.
- API: REST endpoints with interactive Swagger documentation.
- Optional cloud foundation retained: Supabase SQL schema.
- Frontend hosting: Vercel.
- Backend hosting: Render or another Python ASGI host.

## Project structure

```text
skillsphere/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── Procfile
│   └── .env.example
├── src/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── matching.ts
│   │   └── supabase.ts
│   ├── App.tsx
│   ├── data.ts
│   ├── main.tsx
│   └── styles.css
├── supabase/schema.sql
├── .env.example
├── vercel.json
└── package.json
```

## Run the complete application locally

Open two VS Code terminals from the project root.

### 1. Start the backend

Python 3.10+ is recommended.

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**

```powershell
.venv\Scripts\Activate.ps1
```

**macOS/Linux**

```bash
source .venv/bin/activate
```

Install dependencies and start FastAPI:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

- API health: http://127.0.0.1:8000/api/health
- Interactive API docs: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

The SQLite database (`backend/skillsphere.db`) is created automatically on first start and seeded with the demo community.

### 2. Start the frontend

Open a second terminal at the project root:

```bash
npm install
```

Create a `.env` file in the project root using `.env.example` and set:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Then run:

```bash
npm run dev
```

Open the Vite URL, usually http://localhost:5173.

When `VITE_API_URL` is configured, the frontend loads and synchronises its application state with the FastAPI backend. If the backend is unavailable, the frontend falls back to the existing browser localStorage demo data. The UI layout and styling remain the same as the original frontend.

## Backend API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API service information |
| GET | `/api/health` | Health check |
| GET | `/api/state` | Load complete application state |
| PUT | `/api/state` | Persist application state |
| GET | `/api/profiles` | List profiles |
| GET | `/api/profiles/{profile_id}` | Get a profile |
| PUT | `/api/profiles/{profile_id}` | Update a profile |
| GET | `/api/matches?profile_id=me` | Calculate reciprocal matches |
| GET | `/api/skill-chains?profile_id=me` | Find circular three-person exchanges |
| GET | `/api/bookings` | List bookings |
| POST | `/api/bookings` | Create a booking request |
| PATCH | `/api/bookings/{booking_id}` | Update booking status |
| GET | `/api/reviews` | List reviews |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/progress` | Return progress statistics |

All request and response schemas can be explored at `/docs`.

## Test the backend

With the backend running, use these URLs in a browser:

```text
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/api/profiles
http://127.0.0.1:8000/api/matches
http://127.0.0.1:8000/api/skill-chains
http://127.0.0.1:8000/api/bookings
http://127.0.0.1:8000/api/progress
```

For POST, PUT and PATCH requests, use the interactive Swagger page at `http://127.0.0.1:8000/docs`.

## Deploy the backend

The Vercel deployment hosts the frontend. Deploy the FastAPI backend separately to a Python host such as Render.

### Render deployment

1. Push the complete project to GitHub.
2. In Render, create a **New → Web Service** and connect the repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `pip install -r requirements.txt`.
5. Set **Start Command** to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Add environment variable `CORS_ORIGINS` with your Vercel frontend origin, for example `https://your-project.vercel.app` (no trailing slash). Include localhost origins too if you still develop locally.
7. For a persistent SQLite database, attach a persistent disk and set `DATABASE_PATH=/var/data/skillsphere.db`. Without persistent storage, a host may reset the SQLite file during redeploy/restart. For a serious multi-user production deployment, use managed PostgreSQL instead of SQLite.
8. Deploy and open `https://YOUR-BACKEND.onrender.com/api/health` to check it.

## Deploy the frontend to Vercel

1. Import the GitHub repository into Vercel.
2. Set the project Root Directory to the repository root (`./`).
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add environment variable:

```env
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```

7. Deploy. The included `vercel.json` handles client-side route fallback.

After deployment, update the backend `CORS_ORIGINS` environment variable to the exact Vercel URL and redeploy/restart the backend.

## Important security and production notes

This is a hackathon/demo backend, not a production-secure multi-tenant service. It currently stores one shared demo application state in SQLite and does not implement user authentication, per-user authorisation, private messaging, email verification, abuse prevention or payment functionality. CORS is not authentication. Do not put sensitive personal information in this demo. Before opening it to real users, add Supabase Auth or another identity provider, enforce ownership/authorisation on every write, migrate to managed PostgreSQL, add rate limiting and audit logging, and restrict reviews to completed exchanges.

The frontend's existing sample people and sample bookings are demo content. The matching and SkillChain calculations are deterministic algorithms, not a trained AI model. The original Supabase SQL schema is retained as an optional future cloud foundation; the FastAPI/SQLite backend is the currently implemented backend.

## GitHub

From the project root:

```bash
git init
git add .
git commit -m "Add SkillSphere frontend and FastAPI backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/skillsphere.git
git push -u origin main
```

Create the empty GitHub repository first and replace `YOUR_USERNAME`.

## Competition pitch

"SkillSphere turns knowledge into a community resource. Our reciprocal matching engine finds people whose learning goals complement each other, while SkillChain discovers three-way exchanges when a perfect one-to-one match doesn't exist. TimeTwin helps partners find shared availability, and Skill DNA makes each person's teaching and learning identity discoverable. Everyone has something to teach, and everyone has something to learn."
=======
# SkillSphere
>>>>>>> 65a4ad23bb31c1faed5930d2d6935d0c4153c596
