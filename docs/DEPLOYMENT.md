# Production Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide provides step-by-step instructions for deploying DataCrew to production with the **Next.js 15 frontend on Vercel** and the **FastAPI Python backend on Render**.

---

## Architecture Overview

```
[User Browser]
      │
      ▼
┌─────────────────────────────────┐
│ Vercel (Frontend Next.js App)   │
│ URL: https://datacrew.vercel.app│
└─────────────────────────────────┘
      │
      │ BFF Proxy (/api/proxy/*)
      ▼
┌─────────────────────────────────┐
│ Render (FastAPI Python Backend) │
│ URL: https://datacrew-api.onrender.com
└─────────────────────────────────┘
      │
  ┌───┴─────────────────┬──────────────────┐
  ▼                     ▼                  ▼
[Supabase DB]       [Neo4j AuraDB]      [Qdrant / Redis]
```

---

## Part 1: Deploying the Backend on Render

1. **Sign up / Log in to Render**: Go to [render.com](https://render.com).
2. **Create New Blueprint / Web Service**:
   - Click **New +** ──▶ **Web Service** or **Blueprint**.
   - Connect your GitHub repository (`datacrew`).
   - If using **Blueprint**, Render automatically detects `render.yaml` in the root directory.
   - If setting up manually as a Web Service:
     - **Root Directory**: Leave blank or set `.`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r apps/api/requirements.txt`
     - **Start Command**: `python -m uvicorn apps.api.app.main:app --host 0.0.0.0 --port $PORT`

3. **Configure Environment Variables in Render Dashboard**:
   | Variable | Value |
   | :--- | :--- |
   | `MODE` | `cloud` |
   | `JWT_SECRET` | *(Random 64-char string)* |
   | `JWT_TTL_HOURS` | `24` |
   | `GOOGLE_CLIENT_ID` | `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | `YOUR_GOOGLE_CLIENT_SECRET` |
   | `GOOGLE_REDIRECT_URI` | `https://datacrew.vercel.app/auth/google/callback` |
   | `ALLOWED_ORIGINS` | `https://datacrew.vercel.app,http://localhost:3000` |
   | `NEO4J_URI` | `neo4j+s://d8f97ecd.databases.neo4j.io` |
   | `NEO4J_USERNAME` | `neo4j` |

4. **Deploy**: Render will build and deploy the Python app. Note down your backend URL (e.g., `https://datacrew-api.onrender.com`).

---

## Part 2: Deploying the Frontend on Vercel

1. **Sign up / Log in to Vercel**: Go to [vercel.com](https://vercel.com).
2. **Import Project**:
   - Click **Add New Project** ──▶ Import GitHub repository `datacrew`.
   - **Root Directory**: Click edit and select `apps/web`.
   - **Framework Preset**: `Next.js`
   - **Build Command**: `pnpm run build` or default Next.js build.

3. **Configure Environment Variables in Vercel**:
   | Variable | Value |
   | :--- | :--- |
   | `API_URL` | `https://datacrew-api.onrender.com` *(Your Render backend URL)* |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://pvyabkvfirxdblcityll.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_yLhrLp-kE6-1723Cg3h4mA_FVLVAHPR` |

4. **Deploy**: Click **Deploy**. Vercel will build and assign your domain (e.g. `https://datacrew.vercel.app`).

---

## Part 3: Updating Google Cloud Console Credentials

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your Web Application OAuth 2.0 Client ID.
3. Add Production URIs:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:8000`
     - `https://datacrew.vercel.app` (Your Vercel domain)
   - **Authorized redirect URIs**:
     - `http://localhost:8000/auth/google/callback`
     - `http://localhost:3000/auth/google/callback`
     - `https://datacrew.vercel.app/auth/google/callback`
4. Click **Save**.

---

## Verification & Testing

- Navigate to your Vercel deployment URL.
- Click **"Continue with Google"** on `/login` or `/register`.
- Complete Google authentication to land on your production dashboard (`/datasets`).
