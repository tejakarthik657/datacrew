# Production Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide provides step-by-step instructions for deploying DataCrew to production. The frontend runs on Vercel (Next.js 15) and the backend runs on Render (FastAPI Python).

---

## Architecture Overview

```
[User Browser]
      |
      v
+-------------------------------------------+
| Vercel (Next.js 15 Frontend)              |
| Example URL: https://datacrew.vercel.app  |
+-------------------------------------------+
      |
      | BFF Proxy  /api/proxy/*  (server-side only, not exposed to browser)
      v
+-------------------------------------------+
| Render (FastAPI Python Backend)           |
| Example URL: https://datacrew-api.onrender.com |
+-------------------------------------------+
      |
+-----+----------+--------------------+
|               |                    |
v               v                    v
[SQLite DB]   [Neo4j AuraDB]    [Google OAuth]
```

---

## Part 1: Deploy the Backend on Render

### 1.1 Create a Web Service
1. Go to [render.com](https://render.com) and sign in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`datacrew`).
4. Configure the service:
   - **Root Directory**: leave blank (`.`)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r apps/api/requirements.txt`
   - **Start Command**: `PYTHONPATH=. python -m uvicorn apps.api.app.main:app --host 0.0.0.0 --port $PORT`

### 1.2 Set Environment Variables in Render Dashboard
Go to your Render service → **Environment** tab and add these variables:

| Variable | Value |
| :--- | :--- |
| `PYTHONPATH` | `.` |
| `MODE` | `cloud` |
| `JWT_SECRET` | Generate a random 64-character string |
| `JWT_TTL_HOURS` | `24` |
| `GOOGLE_CLIENT_ID` | `158940752809-98knfef1g4rdv808p46ob0l1726i6eij.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | *(From Google Cloud Console — keep secret)* |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-VERCEL-URL.vercel.app/auth/google/callback` |
| `ALLOWED_ORIGINS` | `https://YOUR-VERCEL-URL.vercel.app,http://localhost:3000` |
| `NEO4J_URI` | *(Your Neo4j AuraDB URI — optional for lineage)* |
| `NEO4J_USERNAME` | `neo4j` |
| `NEO4J_PASSWORD` | *(Your Neo4j password — optional)* |

> **Important**: Replace `YOUR-VERCEL-URL` with your actual Vercel domain after deployment (e.g. `datacrew-git-main-yourname.vercel.app`).

### 1.3 Deploy and Note the Backend URL
Click **Deploy**. Once live, copy your Render backend URL (e.g. `https://datacrew-api.onrender.com`). You need this for Vercel.

---

## Part 2: Deploy the Frontend on Vercel

### 2.1 Import the Project
1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New Project** → Import GitHub repository `datacrew`.
3. **Root Directory**: Click edit and set to `apps/web`.
4. **Framework Preset**: Next.js.

### 2.2 Set Environment Variables in Vercel Dashboard
Go to your Vercel project → **Settings** → **Environment Variables** and add:

| Variable | Value |
| :--- | :--- |
| `API_URL` | `https://YOUR-RENDER-BACKEND-URL.onrender.com` |

> **This is the most critical variable.** If `API_URL` is not set, all sign-up, login, and API calls will fail with 500/502 errors because the frontend will try to reach `localhost:8000` which does not exist in production.

### 2.3 Verify Root Directory
In Vercel **Settings** → **General**, confirm **Root Directory** is set to `apps/web`. If it is set to the repository root (`/`), Vercel will not find the correct `package.json` and will fail to detect the correct Next.js version.

### 2.4 Deploy
Click **Deploy**. Your frontend will be available at your Vercel URL.

---

## Part 3: Update Google Cloud Console Credentials

After both deployments are live, update your OAuth configuration:

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 Client ID.
3. Add the following URIs:

**Authorized JavaScript Origins:**
```
http://localhost:3000
https://YOUR-VERCEL-URL.vercel.app
```

**Authorized Redirect URIs:**
```
http://localhost:8000/auth/google/callback
https://YOUR-VERCEL-URL.vercel.app/auth/google/callback
```

4. Click **Save**.

---

## Part 4: Update Render Environment Variables After Vercel Deployment

Once you have your Vercel URL, go back to **Render** and update:

| Variable | Final Value |
| :--- | :--- |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-VERCEL-URL.vercel.app/auth/google/callback` |
| `ALLOWED_ORIGINS` | `https://YOUR-VERCEL-URL.vercel.app,http://localhost:3000` |

---

## Checklist: Common Causes of Sign-Up / Login Failure

| Symptom | Root Cause | Fix |
| :--- | :--- | :--- |
| `/api/session` returns 500 | `API_URL` not set in Vercel | Add `API_URL` environment variable in Vercel dashboard |
| `/api/proxy/auth/google/url` returns 502 | Backend on Render is sleeping (free tier) or `API_URL` wrong | Wait 30s for Render cold start, or verify `API_URL` |
| Google OAuth returns redirect_uri_mismatch | `GOOGLE_REDIRECT_URI` still points to localhost | Update in Render env and Google Cloud Console |
| CORS errors in browser | `ALLOWED_ORIGINS` does not include Vercel domain | Update `ALLOWED_ORIGINS` in Render env |
| Render backend crashes on start | Missing `PYTHONPATH=.` | Confirm env var is set in Render |

---

## Verification

After completing all steps:
1. Visit your Vercel URL.
2. Click **Create your account** and register with email/password.
3. Or click **Continue with Google** for OAuth sign-in.
4. On success you will be redirected to `/datasets`.
