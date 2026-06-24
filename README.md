# DawaCheck

DawaCheck is a hackathon-ready medicine verification app for the SWASTHYA theme.
It provides OCR-based strip scanning, authenticity lookup, Hindi voice guidance,
interaction risk checks, and a counterfeit trend heatmap.

## Screenshots

| Home | Scan | Result | Heatmap |
|------|------|--------|---------|
| ![Home](docs/screenshot-home.png) | ![Scan](docs/screenshot-scan.png) | ![Result](docs/screenshot-result.png) | ![Heatmap](docs/screenshot-heatmap.png) |

## Demo

> 🎥 [Watch demo video](#) — replace this link with your YouTube/Loom URL

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

> Copy `frontend/.env.example` to `frontend/.env` and fill in your values before running.

## Team Roles

- Person 1: Backend API, MongoDB data pipeline, AI logic, endpoint contracts
- Person 2: Frontend scan/OCR/result flow, interaction UI, voice and camera UX
- Person 3: PWA, heatmap, deployment, live demo flow, backup recording

## Tech Stack

- Frontend: React + Vite + Tesseract.js + Leaflet + vite-plugin-pwa
- Backend: Node.js + Express + MongoDB + Google Gemini API

## Project Structure

- frontend/: React app and PWA surface
- backend/: API server, Mongo models, CSV import script

## Local Setup

### 1) Backend

1. Open terminal in backend folder.
2. Create backend/.env using backend/.env.example.
3. Install packages:

```bash
npm install
```

4. Add the required CSV files in backend/data/:
	 - cdsco.csv
	 - jan_aushadhi.csv
   No raw text files are needed for the import flow.
5. Import data:

```bash
npm run import:data
```

6. Start backend:

```bash
npm run dev
```

### 2) Frontend

1. Open terminal in frontend folder.
2. Set frontend/.env:

```env
VITE_API_URL=http://localhost:5000
```

3. Install and run:

```bash
npm install
npm run dev
```

4. Open app at http://localhost:5173

## API Endpoints

- GET /api/verify?name=Metformin
- POST /api/scan-log
- POST /api/interactions
- GET /api/heatmap

## PWA and Android Testing

1. Build frontend:

```bash
npm run build
```

2. For live mobile tests, deploy backend to Render and frontend to Vercel.
3. Set frontend env on Vercel:
	 - VITE_API_URL=https://your-render-url.onrender.com
4. Test "Add to Home Screen" from Android Chrome.
5. Validate full flow on at least 3 Android devices.

## Deployment Checklist

### Backend (Render)

- Root directory: backend
- Build command: npm install
- Start command: node server.js
- Environment variables:
	- MONGO_URI
	- GEMINI_API_KEY
	- GEMINI_MODEL=gemini-2.0-flash
	- PORT=5000

### Frontend (Vercel)

- Root directory: frontend
- Environment variables:
	- VITE_API_URL=https://your-render-url.onrender.com

## Demo Flow (Stage)

1. Scan a genuine strip and show green result + Hindi voice.
2. Scan a risky/expired strip and show alert card.
3. Open heatmap and pause for 3 seconds.
4. Close with: "This data did not exist before DawaCheck."

## Required Screenshots For Judges

- Home scan screen
- OCR result card (green state)
- Alert card (red/yellow state)
- Heatmap screen
- PWA install prompt / home icon

## Live URLs

- Backend (Render): https://your-render-url.onrender.com
- Frontend (Vercel): https://your-vercel-url.vercel.app

## Notes

- Never commit .env files.
- Warm up Render service 10 minutes before demo to avoid cold-start delay.
- Keep a 60-second backup demo video in Google Drive.
