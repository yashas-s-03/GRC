# TrustLens Deployment Guide

## Deploy Backend to Railway

1. Go to railway.app and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your TrustLens repository
4. When Railway asks which folder: select "server"
   (or set Root Directory to /server in settings)
5. Railway auto-detects Node.js and runs "npm start"
6. Go to Settings → Environment Variables and add:
   
   PORT=3001 (Railway sets this automatically)
   FRONTEND_URL=https://your-app.vercel.app
   HIBP_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here

7. Go to Settings → Networking → Generate Domain
8. Copy your Railway URL: 
   https://trustlens-production-xxxx.railway.app
9. Test it: visit /health — should return {"status":"ok"}

## Deploy Frontend to Vercel

1. Go to vercel.com and sign up with GitHub
2. Click "New Project" → Import your GitHub repo
3. IMPORTANT: Set Root Directory to "client"
4. Framework Preset: Vite (auto-detected)
5. Add Environment Variable:
   VITE_API_URL = https://trustlens-production-xxxx.railway.app
   (paste your Railway URL from step 8 above)
6. Click Deploy
7. Copy your Vercel URL: https://trustlens.vercel.app

## Update CORS After Both Are Deployed

1. Go back to Railway
2. Update FRONTEND_URL environment variable to your 
   actual Vercel URL
3. Railway auto-redeploys

## Test Production

Visit these URLs to verify everything works:
- https://your-app.vercel.app → Landing page loads
- https://your-app.vercel.app/?demo=true → Demo mode works
- https://your-app.vercel.app/scan → Scan page loads
- https://your-railway-url/health → Backend healthy
- Run a real scan → Should complete in ~15s

## Demo URLs (update with your real domains)

Demo mode:
https://your-app.vercel.app/?demo=true

Compare mode:
https://your-app.vercel.app/compare?a=stripe.com&b=example.com

## Environment Variables Reference

### Railway (Backend)
| Variable | Value | Required |
|----------|-------|----------|
| PORT | Set by Railway automatically | Auto |
| FRONTEND_URL | Your Vercel URL | Yes |
| HIBP_API_KEY | From haveibeenpwned.com | Optional |
| ANTHROPIC_API_KEY | From console.anthropic.com | Optional |

### Vercel (Frontend)
| Variable | Value | Required |
|----------|-------|----------|
| VITE_API_URL | Your Railway URL | Yes |

## Troubleshooting

Scan not working on production?
→ Check Railway logs for CORS errors
→ Make sure VITE_API_URL has no trailing slash
→ Make sure FRONTEND_URL matches your exact Vercel URL

Page refresh gives 404?
→ Make sure vercel.json exists in client/ folder
→ Check the rewrites rule is correct

EventSource connection failing?
→ Railway free tier sleeps after inactivity
→ Hit /health first to wake it up
→ Consider upgrading Railway plan for demos

PDF download not working?
→ html2canvas needs CORS-enabled images
→ Add crossOrigin="anonymous" to any img tags in report

AI summary not showing?
→ Check ANTHROPIC_API_KEY is set in Railway env vars
→ Check Railway logs for API errors
→ Demo mode always shows fallback summary regardless

Score is different from local?
→ Some checks behave differently from Railway's 
   servers vs your local machine (different IP, 
   different geo). This is expected.
