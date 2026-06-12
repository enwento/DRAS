# Fitbit → Apple Health Smart Sync

A locally runnable + Vercel-deployable app that:
- Connects to Fitbit via OAuth2
- Pulls major metrics (steps, calories, distance, resting HR, intraday HR, sleep, weight)
- Converts data into Apple Health XML format for import workflows
- Supports one-click sync + optional auto-sync in browser

## Important limitation
Apple does **not** expose direct HealthKit write APIs to normal web apps/Vercel functions. This app therefore exports Apple Health-compatible XML for import workflows. Fitbit ECG is not available through Fitbit's public API, so true ECG sync cannot be automated here.

## Local run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Fill values in `.env` from your Fitbit developer app.
4. Start app:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000.

## Fitbit app setup
Set your Fitbit app callback URL to:
- Local: `http://localhost:3000/api/callback`
- Vercel: `https://<your-domain>/api/callback`

## Deploy to Vercel
1. Push repo.
2. Import project in Vercel.
3. Set env vars:
   - `FITBIT_CLIENT_ID`
   - `FITBIT_CLIENT_SECRET`
   - `FITBIT_REDIRECT_URI` (`https://<your-domain>/api/callback`)
4. Deploy.
