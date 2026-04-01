# TrustLens — Local Development

A real GRC (Governance, Risk, Compliance) Trust Score platform for startups. Runs fully locally — no database, no auth, no deployment.

## Quick Start

```bash
# 1. Install root dependencies (concurrently)
cd c:\Users\yasha\OneDrive\Desktop\resume\GRC
npm install

# 2. Install client dependencies
cd client && npm install && cd ..

# 3. Install server dependencies
cd server && npm install && cd ..

# 4. (Optional) Add your HIBP API key
# Edit server/.env — replace "your_key_here" with a key from haveibeenpwned.com/API/Key

# 5. Start everything
npm run dev
```

## URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## How It Works

1. Enter a URL on the landing page or `/scan`
2. The backend runs **23 checks in parallel** against the live site (finishes in under 15s)
3. Fill in the 16-question self-declaration form for bonus points
4. View your full GRCU report with real scores, AI analysis, real findings, and a prioritized action plan
5. Download your report as a PDF, track score deltas on rescans, or use Compare mode to benchmark against competitors

## The 23 Real Checks

| # | Check | Category |
|---|-------|----------|
| 1 | SSL Certificate (grade A–F) | Risk |
| 2 | HTTPS Enforcement | Risk |
| 3 | HTTP Security Headers (6 headers) | Risk |
| 4 | Exposed Sensitive Paths (.env, .git, etc.) | Risk |
| 5 | DNS Records (SPF, DKIM, DMARC) | Compliance |
| 6 | Cookie Security Flags | Compliance |
| 7 | Third-Party Scripts | Risk |
| 8 | Privacy Policy Detection | Governance |
| 9 | Terms of Service Detection | Governance |
| 10 | Cookie Consent Banner | Governance |
| 11 | Robots.txt | Compliance |
| 12 | Sitemap | Compliance |
| 13 | HaveIBeenPwned Breach Check | Compliance |
| 14 | Redirect Chain Analysis | Risk |
| 15 | Favicon Present | User Trust |
| 16 | Meta Description Present | User Trust |
| 17 | Open Graph Tags | User Trust |
| 18 | Mobile Viewport Meta | User Trust |
| 19 | Custom Font Loading | User Trust |
| 20 | Image Alt Text | User Trust |
| 21 | Broken Internal Links | User Trust |
| 22 | Page Size Signal | User Trust |
| 23 | Contact Information | User Trust |

## Scoring

| Category | Max Points |
|----------|-----------|
| Governance | 30 |
| Risk | 40 |
| Compliance | 30 |
| User Trust | 20 |
| **Total** | **120 (Normalized to 100)** |

Grades: **A** (85–100) · **B** (70–84) · **C** (50–69) · **D** (<50)

## Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Vite (port 3000)
- **Backend**: Node.js + Express (port 3001)
- **Scanner**: Native Node.js (`tls`, `dns/promises`) + axios + cheerio

## Environment Variables

`server/.env`:
```
PORT=3001
HIBP_API_KEY=your_key_here     # Get free key: haveibeenpwned.com/API/Key
ANTHROPIC_API_KEY=your_key_here # For Claude AI executive summaries
```

## File Structure
```
GRC/
├── package.json          ← Root: concurrently scripts
├── client/               ← React frontend (port 3000)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ScanPage.jsx      ← Parallel streaming checks with live ETA
│   │   │   ├── ComparePage.jsx   ← Side-by-side benchmarking
│   │   │   └── ReportPage.jsx    ← AI analysis, PDF export, Rescan deltas
│   │   └── components/
│   └── vite.config.js    ← Proxy /api → localhost:3001
└── server/               ← Express backend (port 3001)
    ├── index.js          ← All 23 checks + Promise.allSettled + AI integration
    ├── package.json
    └── .env              ← HIBP/Anthropic keys
```

## Notes
- Scan results are stored in browser `localStorage` — no database
- HIBP check is skipped gracefully if no API key is configured
- All HTTP requests use a 10-second timeout
- Each check is individually wrapped in try/catch — one failure won't break the whole scan

## Demo Day Quick Start

To launch the app in Demo Mode (skips forms, pre-fills Stripe, enables AI fallback):

1. **Start both servers:**
   ```bash
   # Terminal 1
   cd client && npm run dev
   
   # Terminal 2 
   cd server && node index.js
   ```

2. **Open the Demo URL:**
   Go to `http://localhost:3000/?demo=true`
   
3. **Compare Feature:**
   Test side-by-side scans at `http://localhost:3000/compare?a=stripe.com&b=example.com`
