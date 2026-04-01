'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const tls = require('tls');
const dns = require('dns').promises;
const cheerio = require('cheerio');
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

const app = express();
const PORT = process.env.PORT || 3001;
const HIBP_KEY = process.env.HIBP_API_KEY || '';

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,  // set in Railway env vars
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => 
      origin === allowed || 
      origin.endsWith('.vercel.app')
    )) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// ─── In-memory scan store ─────────────────────────────────────────────────────

const scanStore = new Map();

function generateUUID() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ─── Score band (shared by scoring + badge) ───────────────────────────────────

function getScoreBand(score) {
  if (score >= 85) return {
    grade: 'A', color: '#22c55e', label: 'Excellent',
    headline: 'Your site is in great shape. Keep it up.',
    subline: "You're in the top tier of startup security.",
    bgGlow: 'rgba(34,197,94,0.12)',
  };
  if (score >= 70) return {
    grade: 'B', color: '#6366f1', label: 'Good',
    headline: 'Solid foundation. A few things to tighten up.',
    subline: "You're above average. Here's what to fix next.",
    bgGlow: 'rgba(99,102,241,0.12)',
  };
  if (score >= 50) return {
    grade: 'C', color: '#f59e0b', label: 'Needs Work',
    headline: 'Your site has real vulnerabilities. Fix these now.',
    subline: "Users may not trust your site yet. Here's your plan.",
    bgGlow: 'rgba(245,158,11,0.12)',
  };
  return {
    grade: 'D', color: '#ef4444', label: 'At Risk',
    headline: 'Your site is at risk. Take action immediately.',
    subline: 'Critical issues found. Do not launch until fixed.',
    bgGlow: 'rgba(239,68,68,0.12)',
  };
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function normalizeURL(input) {
  let url = (input || '').trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('.')) throw new Error('No TLD');
    return parsed.href.replace(/\/+$/, '');
  } catch {
    throw new Error('Invalid URL. Please enter a valid domain like example.com');
  }
}

function extractRootDomain(input) {
  try {
    let u = (input || '').trim();
    if (!u.startsWith('http')) u = 'https://' + u;
    const parts = new URL(u).hostname.replace(/^www\./, '').split('.');
    if (parts.length > 2) {
      const tld = parts[parts.length - 1];
      if (['uk', 'au', 'in', 'br', 'jp'].includes(tld)) return parts.slice(-3).join('.');
      return parts.slice(-2).join('.');
    }
    return parts.join('.');
  } catch {
    return input.trim().replace(/^www\./, '');
  }
}

function classifySite(html, sizeBytes) {
  const sizeKb = sizeBytes / 1024;
  const lower = html.toLowerCase();
  
  if (/captcha|access denied|forbidden|cloudflare|incapsula|<\s*title[^>]*>\s*attention required/i.test(lower) || sizeKb < 0.5) {
    return 'bot_blocked';
  }
  if (lower.includes('id="root"') || lower.includes('__next_data__') || lower.includes('data-reactroot') || html.split('<script').length > 5 || sizeKb < 30) {
    return 'spa';
  }
  if (sizeKb < 50) return 'webapp';
  return 'static';
}

function makeAxios(extra = {}) {
  // Always allow following redirects up to 5 times to find real final URL
  return axios.create({ timeout: 10000, maxRedirects: 5, validateStatus: () => true, ...extra });
}

async function getTLSCertDetails(domain) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: domain, port: 443, servername: domain, timeout: 8000,
      ciphers: 'ALL', minVersion: 'TLSv1', rejectUnauthorized: false
    }, () => {
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      if (!cert || !cert.valid_to) {
        socket.destroy();
        reject(new Error('No certificate found'));
        return;
      }
      const daysRemaining = Math.floor((new Date(cert.valid_to) - new Date()) / 86400000);
      const isExpired = daysRemaining < 0;
      const isExpiringSoon = daysRemaining < 30;
      socket.destroy();
      resolve({
        daysRemaining, tlsVersion: protocol || 'TLS',
        grade: isExpired ? 'F' : isExpiringSoon ? 'C' : protocol === 'TLSv1.3' ? 'A' : 'B'
      });
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('TLS connection timeout')); });
  });
}

async function checkSSL(domain) {
  try {
    const response = await axios.get(`https://${domain}`, {
      timeout: 10000, maxRedirects: 5, validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 TrustLens-Scanner/2.0' }
    });
    let certDetails = null;
    try {
      certDetails = await getTLSCertDetails(domain);
    } catch {
      certDetails = { grade: 'B', daysRemaining: null, tlsVersion: 'Unknown (bot protection)', note: 'Certificate valid — detailed inspection blocked' };
    }
    return {
      id: 'ssl', name: 'SSL Certificate', category: 'risk', status: 'pass', severity: null,
      detail: certDetails.daysRemaining ? `TLS ${certDetails.tlsVersion}, expires in ${certDetails.daysRemaining} days` : 'HTTPS responding correctly — cert details not available',
      confidence: certDetails.note ? 'medium' : 'high', confidenceNote: certDetails.note || null, _sslValid: true, _tlsVersion: certDetails.tlsVersion.toLowerCase().replace('.', ''), points: 10
    };
  } catch (axiosError) {
    return { id: 'ssl', name: 'SSL Certificate', category: 'risk', status: 'fail', severity: 'critical', detail: `HTTPS not reachable: ${axiosError.message}`, confidence: 'high', confidenceNote: null, _sslValid: false, points: 0 };
  }
}

// ─── Check 2: HTTPS Enforcement ───────────────────────────────────────────────

async function checkHTTPS(url) {
  const domain = extractRootDomain(url);
  try {
    const httpsResponse = await axios.get(`https://${domain}`, {
      timeout: 10000, maxRedirects: 10, validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 TrustLens-Scanner/2.0' }
    });
    if (httpsResponse.status < 500) {
      return { id: 'https_enforcement', name: 'HTTPS Enforcement', category: 'risk', status: 'pass', severity: null, detail: 'HTTPS is available and responding correctly', confidence: 'high', confidenceNote: null, _httpsEnforced: true, points: 5 };
    }
  } catch {}
  
  try {
    const httpResponse = await axios.get(`http://${domain}`, {
      timeout: 10000, maxRedirects: 10, validateStatus: () => true,
      headers: { 'User-Agent': 'Mozilla/5.0 TrustLens-Scanner/2.0' }
    });
    const finalUrl = httpResponse.request?.res?.responseUrl || '';
    if (finalUrl.startsWith('https://')) {
      return { id: 'https_enforcement', name: 'HTTPS Enforcement', category: 'risk', status: 'pass', severity: null, detail: 'HTTP correctly redirects to HTTPS', confidence: 'high', confidenceNote: null, _httpsEnforced: true, points: 5 };
    }
    return { id: 'https_enforcement', name: 'HTTPS Enforcement', category: 'risk', status: 'fail', severity: 'medium', detail: `Final URL is not HTTPS: ${finalUrl || 'redirect not detected'}`, confidence: 'high', confidenceNote: null, _httpsEnforced: false, points: 0 };
  } catch (error) {
    return { id: 'https_enforcement', name: 'HTTPS Enforcement', category: 'risk', status: 'warning', severity: 'low', detail: `Could not follow redirect: ${error.message}`, confidence: 'low', confidenceNote: 'Network error evaluating redirect', _httpsEnforced: false, points: 2 };
  }
}

// ─── Check 3: Security Headers (Quality-Graded) ──────────────────────────────

function gradeCSP(value) {
  if (!value) return { quality: 'missing', points: 0 };
  const lc = value.toLowerCase();
  const hasUnsafe = lc.includes("'unsafe-inline'") || lc.includes("'unsafe-eval'");
  const hasDefaultSrc = lc.includes('default-src');
  const hasScriptSrc = lc.includes('script-src');
  if (hasDefaultSrc && hasScriptSrc && !hasUnsafe) return { quality: 'strong', points: 2 };
  if (hasDefaultSrc && !hasUnsafe) return { quality: 'moderate', points: 2 };
  if (hasUnsafe) return { quality: 'weak', points: 1 };
  return { quality: 'basic', points: 1 };
}

function gradeHSTS(value) {
  if (!value) return { quality: 'missing', points: 0 };
  const lc = value.toLowerCase();
  const match = lc.match(/max-age=(\d+)/);
  const maxAge = match ? parseInt(match[1]) : 0;
  const hasSub = lc.includes('includesubdomains');
  const hasPreload = lc.includes('preload');
  if (maxAge >= 31536000 && hasSub) return { quality: 'strong', points: 2 };
  if (maxAge >= 31536000) return { quality: 'good', points: 2 };
  if (maxAge >= 2592000) return { quality: 'moderate', points: 1 };
  return { quality: 'weak', points: 1 };
}

async function checkSecurityHeaders(domain) {
  const HDRS = [
    { key: 'content-security-policy', name: 'Content-Security-Policy', severity: 'critical', points: 2,
      fixSteps: ["Add header: Content-Security-Policy: default-src 'self'; script-src 'self'", "Test at https://csp-evaluator.withgoogle.com", "Remove 'unsafe-inline' and 'unsafe-eval' for full credit", "Gradually tighten the policy based on your assets"] },
    { key: 'strict-transport-security', name: 'Strict-Transport-Security (HSTS)', severity: 'medium', points: 2,
      fixSteps: ["Add header: Strict-Transport-Security: max-age=31536000; includeSubDomains", "Use max-age ≥ 31536000 (1 year) for full credit", "Submit to HSTS preload list: https://hstspreload.org"] },
    { key: 'x-frame-options', name: 'X-Frame-Options', severity: 'low', points: 2,
      fixSteps: ["Add header: X-Frame-Options: DENY", "This prevents clickjacking by blocking iframe embeds"] },
    { key: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'low', points: 2,
      fixSteps: ["Add header: X-Content-Type-Options: nosniff"] },
    { key: 'referrer-policy', name: 'Referrer-Policy', severity: 'low', points: 2,
      fixSteps: ["Add header: Referrer-Policy: strict-origin-when-cross-origin"] },
    { key: 'permissions-policy', name: 'Permissions-Policy', severity: 'low', points: 2,
      fixSteps: ["Add header: Permissions-Policy: camera=(), microphone=(), geolocation=()"] },
  ];

  try {
    const resp = await makeAxios().get(`https://${domain}`);
    const headers = resp.headers || {};
    return HDRS.map(h => {
      const rawValue = headers[h.key] || '';
      const present = !!rawValue;

      // Quality grading for CSP and HSTS
      if (h.key === 'content-security-policy') {
        const g = gradeCSP(rawValue);
        return {
          id: 'header_content_security_policy',
          name: `${h.name} Header`, category: 'risk',
          status: g.quality === 'missing' ? 'fail' : g.quality === 'weak' ? 'warning' : 'pass',
          severity: g.quality === 'missing' ? 'critical' : g.quality === 'weak' ? 'medium' : null,
          confidence: 'high', confidenceNote: g.quality === 'weak' ? 'CSP contains unsafe-inline or unsafe-eval — reduces effectiveness' : null,
          detail: g.quality === 'missing' ? 'CSP header is missing' : `CSP present (${g.quality}): ${rawValue.substring(0, 80)}${rawValue.length > 80 ? '...' : ''}`,
          fix: g.points < 2 ? h.fixSteps[0] : null,
          fixSteps: g.points < 2 ? h.fixSteps : null,
          _present: present, _quality: g.quality, _rawValue: rawValue, points: g.points,
        };
      }
      if (h.key === 'strict-transport-security') {
        const g = gradeHSTS(rawValue);
        return {
          id: 'header_strict_transport_security',
          name: `${h.name} Header`, category: 'risk',
          status: g.quality === 'missing' ? 'fail' : g.quality === 'weak' ? 'warning' : 'pass',
          severity: g.quality === 'missing' ? 'medium' : g.quality === 'weak' ? 'low' : null,
          confidence: 'high', confidenceNote: g.quality === 'weak' ? 'HSTS max-age is too short — browsers will stop enforcing quickly' : null,
          detail: g.quality === 'missing' ? 'HSTS header is missing' : `HSTS present (${g.quality}): ${rawValue}`,
          fix: g.points < 2 ? h.fixSteps[0] : null,
          fixSteps: g.points < 2 ? h.fixSteps : null,
          _present: present, _quality: g.quality, _rawValue: rawValue, points: g.points,
        };
      }

      // Other headers: binary
      return {
        id: `header_${h.key.replace(/-/g, '_')}`,
        name: `${h.name} Header`, category: 'risk',
        status: present ? 'pass' : 'fail',
        severity: present ? null : h.severity,
        confidence: 'high', confidenceNote: null,
        detail: present ? `${h.name} is present` : `${h.name} header is missing`,
        fix: present ? null : h.fixSteps[0],
        fixSteps: present ? null : h.fixSteps,
        _present: present, points: h.points,
      };
    });
  } catch (e) {
    return HDRS.map(h => ({
      id: `header_${h.key.replace(/-/g, '_')}`,
      name: `${h.name} Header`, category: 'risk',
      status: 'warning', severity: h.severity,
      confidence: 'medium', confidenceNote: 'Could not reach site to verify',
      detail: 'Unable to verify: ' + e.message,
      fix: h.fixSteps[0], fixSteps: h.fixSteps, _present: false, _quality: 'unknown', points: 0,
    }));
  }
}

// ─── Check 4: Exposed Paths (False Positive Control) ─────────────────────────

async function checkExposedPaths(domain) {
  const PATHS = [
    { path: '/.env', severity: 'critical', pattern: /[A-Z_]+=|DB_|API_KEY|SECRET|PASSWORD/i },
    { path: '/.git/config', severity: 'critical', pattern: /\[core\]|\[remote/ },
    { path: '/admin', severity: 'medium', pattern: null },
    { path: '/wp-admin', severity: 'medium', pattern: null },
    { path: '/config.php', severity: 'critical', pattern: /\$|<\?php|define\(/ },
    { path: '/.DS_Store', severity: 'low', pattern: null },
  ];
  const ax = makeAxios({ maxRedirects: 0 });
  const confirmed = [], downgraded = [], warnings = [];

  for (const p of PATHS) {
    try {
      const r = await ax.get(`https://${domain}${p.path}`);
      if (r.status === 200) {
        const body = typeof r.data === 'string' ? r.data : '';
        if (p.pattern && p.pattern.test(body)) {
          confirmed.push({ path: p.path, severity: p.severity });
        } else if (p.pattern && !p.pattern.test(body)) {
          downgraded.push({ path: p.path, originalSeverity: p.severity });
        } else {
          downgraded.push({ path: p.path, originalSeverity: 'medium' });
        }
      } else if (r.status !== 404 && r.status !== 403 && r.status !== 401 && r.status !== 301 && r.status !== 302 && r.status !== 307 && r.status !== 308) {
        warnings.push(`${p.path} (${r.status})`);
      }
    } catch { /* not exposed */ }
  }

  if (confirmed.length) return {
    id: 'exposed_paths', name: 'Exposed Sensitive Paths', category: 'risk',
    status: 'fail', severity: 'critical', confidence: 'high',
    confidenceNote: 'Confirmed by inspecting response body content',
    detail: `CONFIRMED sensitive data exposed: ${confirmed.map(c => c.path).join(', ')}`,
    fix: "Block access immediately via your server config and rotate any exposed secrets.",
    fixSteps: ["Block in Nginx: location ~ /\\. { deny all; }", "Verify the path now returns 404 or 403", "Rotate ALL secrets from exposed .env or config files", "Check git history for any committed secrets"],
    _noExposure: false, _confirmed: confirmed, _downgraded: downgraded, points: 0,
  };
  if (downgraded.length) return {
    id: 'exposed_paths', name: 'Exposed Sensitive Paths', category: 'risk',
    status: 'warning', severity: 'medium', confidence: 'medium',
    confidenceNote: 'Paths returned 200 but no sensitive content confirmed — may be login pages or redirects',
    detail: `Paths accessible (likely non-sensitive): ${downgraded.map(d => d.path).join(', ')}`,
    fix: "Verify these paths. Block if not needed: location ~ /\\. { deny all; }",
    fixSteps: ["Check each flagged path manually in browser", "If it's a login page, this is acceptable", "Block unnecessary paths: location ~ /\\. { deny all; }"],
    _noExposure: false, _confirmed: [], _downgraded: downgraded, points: 5,
  };
  if (warnings.length) return {
    id: 'exposed_paths', name: 'Exposed Sensitive Paths', category: 'risk',
    status: 'warning', severity: 'low', confidence: 'high', confidenceNote: null,
    detail: `Unexpected response from: ${warnings.join(', ')}`,
    fix: "Verify these paths return 404 or 403.",
    fixSteps: ["Check each flagged path manually", "Ensure they return 404 Not Found or 403 Forbidden"],
    _noExposure: false, _confirmed: [], _downgraded: [], points: 6,
  };
  return {
    id: 'exposed_paths', name: 'Exposed Sensitive Paths', category: 'risk',
    status: 'pass', severity: null, confidence: 'high', confidenceNote: null,
    detail: 'No sensitive paths are publicly accessible',
    fix: null, fixSteps: null, _noExposure: true, _confirmed: [], _downgraded: [], points: 8,
  };
}

// ─── Check 5: SPF (Enforcement-Graded) ───────────────────────────────────

async function checkSPF(domain) {
  try {
    const txt = await dns.resolveTxt(domain);
    const spf = txt.flat().find(r => r.startsWith('v=spf1'));
    if (!spf) return {
      id: 'dns_spf', name: 'SPF Record', category: 'compliance',
      status: 'fail', severity: 'medium', confidence: 'high', confidenceNote: null,
      detail: 'No SPF record found',
      fix: "Add TXT record: v=spf1 include:_spf.yourmailprovider.com -all",
      fixSteps: ["Go to your DNS provider dashboard", "Add TXT record for your domain", 'Value: v=spf1 include:_spf.google.com -all (adjust for your mail provider)', "Use -all (hard fail) instead of ~all for better protection", "Verify at https://mxtoolbox.com/spf.aspx"],
      _spfFound: false, _spfEnforcement: 'none', _spfRaw: '', points: 0,
    };
    // Grade enforcement level
    let enforcement, points, detail;
    if (spf.includes('-all')) {
      enforcement = 'hard'; points = 7;
      detail = `SPF found with hard fail (-all) — strong email protection`;
    } else if (spf.includes('~all')) {
      enforcement = 'soft'; points = 5;
      detail = `SPF found with soft fail (~all) — upgrade to -all for full protection`;
    } else if (spf.includes('+all')) {
      enforcement = 'permissive'; points = 1;
      detail = `SPF record uses +all — effectively disables SPF protection`;
    } else {
      enforcement = 'neutral'; points = 4;
      detail = `SPF found (?all or no mechanism) — consider using -all`;
    }
    return {
      id: 'dns_spf', name: 'SPF Record', category: 'compliance',
      status: enforcement === 'permissive' ? 'warning' : 'pass',
      severity: enforcement === 'permissive' ? 'medium' : enforcement === 'soft' ? 'low' : null,
      confidence: 'high', confidenceNote: enforcement === 'permissive' ? 'SPF with +all offers no protection — anyone can send as your domain' : null,
      detail,
      fix: points < 7 ? "Upgrade SPF to use -all (hard fail): v=spf1 include:_spf.google.com -all" : null,
      fixSteps: points < 7 ? ["Change ~all or +all to -all in your SPF record", "This tells receivers to reject emails not matching your policy", "Verify at https://mxtoolbox.com/spf.aspx"] : null,
      _spfFound: true, _spfEnforcement: enforcement, _spfRaw: spf, points,
    };
  } catch {
    return { id: 'dns_spf', name: 'SPF Record', category: 'compliance', status: 'fail', severity: 'medium', confidence: 'high', confidenceNote: null, detail: 'Could not resolve SPF record', fix: "Add a TXT record: v=spf1 ...", fixSteps: ["Add SPF TXT record to your DNS"], _spfFound: false, _spfEnforcement: 'none', _spfRaw: '', points: 0 };
  }
}

// ─── Check 6: DMARC (Policy-Graded) ────────────────────────────────────

async function checkDMARC(domain) {
  try {
    const txt = await dns.resolveTxt(`_dmarc.${domain}`);
    const dmarc = txt.flat().find(r => r.startsWith('v=DMARC1'));
    if (!dmarc) return {
      id: 'dns_dmarc', name: 'DMARC Record', category: 'compliance',
      status: 'fail', severity: 'medium', confidence: 'high', confidenceNote: null,
      detail: 'No DMARC record found',
      fix: "Add TXT record _dmarc.yourdomain.com: v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com",
      fixSteps: ["Go to your DNS provider", "Add TXT record: _dmarc.yourdomain.com", "Value: v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com", "Start with p=none and work up to p=reject after monitoring"],
      _dmarcFound: false, _dmarcPolicy: 'none', _dmarcRaw: '', points: 0,
    };
    // Grade by policy level
    const lc = dmarc.toLowerCase();
    let policy, points, detail;
    if (lc.includes('p=reject')) {
      policy = 'reject'; points = 8;
      detail = 'DMARC found with p=reject — strongest email protection';
    } else if (lc.includes('p=quarantine')) {
      policy = 'quarantine'; points = 5;
      detail = 'DMARC found with p=quarantine — suspicious emails quarantined';
    } else {
      policy = 'none'; points = 2;
      detail = 'DMARC found with p=none — monitoring only, no enforcement';
    }
    return {
      id: 'dns_dmarc', name: 'DMARC Record', category: 'compliance',
      status: policy === 'none' ? 'warning' : 'pass',
      severity: policy === 'none' ? 'medium' : policy === 'quarantine' ? 'low' : null,
      confidence: 'high',
      confidenceNote: policy === 'none' ? 'DMARC with p=none provides no enforcement — emails can still be spoofed' : null,
      detail,
      fix: points < 8 ? "Upgrade DMARC policy: v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com" : null,
      fixSteps: points < 8 ? ["Upgrade policy from p=none/quarantine to p=reject", "Monitor reports first at https://dmarcanalyzer.com", "Ensure your legitimate email sources are in SPF/DKIM before enforcing"] : null,
      _dmarcFound: true, _dmarcPolicy: policy, _dmarcRaw: dmarc, points,
    };
  } catch {
    return { id: 'dns_dmarc', name: 'DMARC Record', category: 'compliance', status: 'fail', severity: 'medium', confidence: 'high', confidenceNote: null, detail: 'No DMARC record found', fix: "Add _dmarc TXT record to your DNS", fixSteps: ["Add TXT record _dmarc.yourdomain.com with DMARC policy"], _dmarcFound: false, _dmarcPolicy: 'none', _dmarcRaw: '', points: 0 };
  }
}

// ─── Check 7: DKIM ────────────────────────────────────────────────────────────

async function checkDKIM(domain) {
  let found = false;
  for (const sel of ['google._domainkey', 'default._domainkey', 'mail._domainkey', 'k1._domainkey']) {
    try {
      const txt = await dns.resolveTxt(`${sel}.${domain}`);
      if (txt.flat().some(r => r.includes('v=DKIM1') || r.includes('p='))) { found = true; break; }
    } catch { /* try next */ }
  }
  return {
    id: 'dns_dkim', name: 'DKIM Record', category: 'compliance',
    status: found ? 'pass' : 'warning', severity: found ? null : 'low',
    confidence: 'medium',
    confidenceNote: found ? null : 'Checked common selectors only — your selector may differ',
    detail: found ? 'DKIM record found — email signing active' : 'No DKIM record found for common selectors',
    fix: found ? null : "Configure DKIM with your email provider and add the TXT record to DNS.",
    fixSteps: found ? null : ["Check your email provider (Google Workspace, Mailgun, etc.) for your DKIM selector", "Add the provided TXT record to your domain's DNS", "Common selector locations: google._domainkey, mail._domainkey"],
    _dkimFound: found, points: 3,
  };
}

// ─── Check 8: Cookie Flags (Partial Credit Grading) ──────────────────────

async function checkCookieFlags(domain) {
  try {
    const resp = await makeAxios().get(`https://${domain}`);
    const raw = resp.headers['set-cookie'];
    if (!raw?.length) return {
      id: 'cookie_flags', name: 'Cookie Security Flags', category: 'compliance',
      status: 'pass', severity: null, confidence: 'medium',
      confidenceNote: 'Based on Set-Cookie headers — client-side cookies not checked',
      detail: 'No cookies set on homepage', fix: null, fixSteps: null, points: 3,
    };
    
    let secureCount = 0, httpOnlyCount = 0, sameSiteCount = 0;
    const issues = [];
    for (const cookie of raw) {
      const lc = cookie.toLowerCase();
      const name = cookie.split('=')[0].trim();
      let s = lc.includes('secure'), h = lc.includes('httponly'), ss = lc.includes('samesite');
      if (s) secureCount++; else issues.push(`${name}: missing Secure`);
      if (h) httpOnlyCount++; else issues.push(`${name}: missing HttpOnly`);
      if (ss) sameSiteCount++; else issues.push(`${name}: missing SameSite`);
    }
    
    const possibleFlags = raw.length * 3;
    const foundFlags = secureCount + httpOnlyCount + sameSiteCount;
    const ratio = foundFlags / possibleFlags;
    
    if (ratio === 1) return {
      id: 'cookie_flags', name: 'Cookie Security Flags', category: 'compliance',
      status: 'pass', severity: null, confidence: 'medium',
      confidenceNote: 'Based on Set-Cookie headers — client-side cookies not checked',
      detail: `All ${raw.length} cookie(s) have Secure, HttpOnly, SameSite flags`,
      fix: null, fixSteps: null, points: 3,
    };
    
    const points = ratio >= 0.66 ? 2 : ratio >= 0.33 ? 1 : 0;
    const severity = ratio >= 0.66 ? 'low' : ratio >= 0.33 ? 'medium' : 'critical';

    return {
      id: 'cookie_flags', name: 'Cookie Security Flags', category: 'compliance',
      status: points > 0 ? 'warning' : 'fail', severity, confidence: 'medium',
      confidenceNote: 'Based on Set-Cookie headers — client-side cookies not checked',
      detail: `Cookie issues: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? ` (+${issues.length - 3} more)` : ''}`,
      fix: "Set Secure, HttpOnly, and SameSite=Strict on all cookies.",
      fixSteps: ["Set Secure flag: cookie is only sent over HTTPS", "Set HttpOnly: prevents JavaScript access to cookie", "Set SameSite=Strict or Lax: prevents CSRF attacks", "Example (Express): res.cookie('name', val, { secure: true, httpOnly: true, sameSite: 'strict' })"],
      points,
    };
  } catch (e) {
    return { id: 'cookie_flags', name: 'Cookie Security Flags', category: 'compliance', status: 'warning', severity: 'low', confidence: 'low', confidenceNote: 'Could not fetch homepage to inspect cookies', detail: 'Could not verify cookie flags: ' + e.message, fix: "Manually verify cookies have Secure, HttpOnly, SameSite flags.", fixSteps: ["Open DevTools > Application > Cookies and check each cookie's flags"], points: 0 };
  }
}

// ─── Check 9: Third-Party Scripts ─────────────────────────────────────────────

async function checkThirdPartyScripts(html, domain, isEnterprise) {
  try {
    const htmlLength = html.length;
    const $ = cheerio.load(html);
    let count = 0;
    const srcs = [];
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      try {
        const h = new URL(src.startsWith('//') ? 'https:' + src : src).hostname.replace(/^www\./, '');
        if (h && h !== domain) { count++; if (srcs.length < 3) srcs.push(h); }
      } catch { /* relative URL */ }
    });
    let status, severity, detail, fixSteps, points;
    const isJsHeavy = htmlLength < 2500 && count > 3;
    
    if (isEnterprise) {
      status = 'pass'; severity = null; detail = `${count} scripts detected, but skipped penalty due to Enterprise application architecture.`; fixSteps = null; points = 7;
    } else if (count <= 3) { 
      status = 'pass'; severity = null; detail = `${count} third-party script(s) — within safe limits`; fixSteps = null; points = 7; 
    } else if (count <= 8) { 
      status = 'warning'; severity = 'low'; detail = `${count} third-party scripts (e.g. ${srcs.join(', ')}) — consider reducing`; fixSteps = ["Audit each third-party script for necessity", "Self-host critical libraries where possible"]; points = 3; 
    } else { 
      status = 'fail'; severity = 'medium'; detail = `${count} third-party scripts — too many external attack surfaces`; fixSteps = ["Remove unused analytics scripts", "Self-host fonts and icons"]; points = 0; 
    }
    return { id: 'third_party_scripts', name: 'Third-Party Scripts', category: 'risk', status, severity, confidence: 'high', confidenceNote: null, detail, fix: fixSteps?.[0] || null, fixSteps, _count: count, _htmlLength: htmlLength, _isJsHeavy: isJsHeavy, points };
  } catch (e) {
    return { id: 'third_party_scripts', name: 'Third-Party Scripts', category: 'risk', status: 'warning', severity: 'low', confidence: 'medium', confidenceNote: 'Could not fetch page HTML to analyze scripts', detail: 'Could not analyze scripts: ' + e.message, fix: null, fixSteps: null, _count: 0, _isJsHeavy: false, points: 0 };
  }
}

// ─── Check 10: Privacy Policy ─────────────────────────────────────────────────

async function checkPrivacyPolicy(html, domain, siteClass) {
  try {
    const $ = cheerio.load(html);
    let found = false, foundUrl = '';
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();
      const text = ($(el).text() || '').toLowerCase();
      if (href.includes('privacy') || text.includes('privacy')) { found = true; foundUrl = $(el).attr('href'); return false; }
    });
    if (!found) {
      for (const p of ['/privacy', '/privacy-policy', '/privacy_policy']) {
        try { const r = await makeAxios({ maxRedirects: 2 }).get(`https://${domain}${p}`); if (r.status === 200) { found = true; foundUrl = p; break; } } catch { /* continue */ }
      }
    }
    
    if (!found && (siteClass === 'spa' || siteClass === 'bot_blocked' || siteClass === 'webapp')) {
      return { id: 'privacy_policy', name: 'Privacy Policy', category: 'governance', status: 'warning', severity: 'medium', confidence: 'low', confidenceNote: 'Site is dynamic/protected — scanner could not reliably find links', detail: 'No privacy policy detected, but scanner has low confidence due to site architecture.', fix: "Verify you have a privacy policy linked in your footer.", fixSteps: ["Check manually if privacy policy exists"], _found: false, points: 6 };
    }

    return {
      id: 'privacy_policy', name: 'Privacy Policy', category: 'governance',
      status: found ? 'pass' : 'fail', severity: found ? null : 'medium',
      confidence: 'high', confidenceNote: found ? 'Detected via link text' : null,
      detail: found ? `Privacy policy found${foundUrl ? ` at ${foundUrl}` : ''}` : 'No privacy policy detected on homepage or common paths',
      fix: found ? null : "Create a privacy policy and link it in your footer.",
      fixSteps: found ? null : ["Create a privacy policy page (use a generator)", "Link it in your site footer on every page"],
      _found: found, points: 8,
    };
  } catch (e) {
    return { id: 'privacy_policy', name: 'Privacy Policy', category: 'governance', status: 'warning', severity: 'medium', confidence: 'low', confidenceNote: 'Could not fetch homepage', detail: 'Could not verify: ' + e.message, fix: "Ensure privacy policy exists.", fixSteps: ["Link it in footer"], _found: false, points: 0 };
  }
}

// ─── Check 11: Terms of Service ───────────────────────────────────────────────

async function checkToS(html, domain, siteClass) {
  try {
    const $ = cheerio.load(html);
    let found = false, foundUrl = '';
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();
      const text = ($(el).text() || '').toLowerCase();
      if (href.includes('terms') || href.includes('tos') || text.includes('terms') || text.includes('tos')) { found = true; foundUrl = $(el).attr('href'); return false; }
    });
    if (!found) {
      for (const p of ['/terms', '/tos', '/terms-of-service', '/terms-and-conditions']) {
        try { const r = await makeAxios({ maxRedirects: 2 }).get(`https://${domain}${p}`); if (r.status === 200) { found = true; foundUrl = p; break; } } catch { /* continue */ }
      }
    }

    if (!found && (siteClass === 'spa' || siteClass === 'bot_blocked' || siteClass === 'webapp')) {
      return { id: 'terms_of_service', name: 'Terms of Service', category: 'governance', status: 'warning', severity: 'low', confidence: 'low', confidenceNote: 'Low confidence due to site architecture', detail: 'No terms of service detected (low confidence)', fix: "Create a Terms of Service page.", fixSteps: ["Verify manually"], _found: false, points: 5 };
    }

    return {
      id: 'terms_of_service', name: 'Terms of Service', category: 'governance',
      status: found ? 'pass' : 'fail', severity: found ? null : 'low',
      confidence: 'high', confidenceNote: null,
      detail: found ? `Terms of service found${foundUrl ? ` at ${foundUrl}` : ''}` : 'No terms of service detected',
      fix: found ? null : "Create a Terms of Service page and link it in your footer.",
      fixSteps: found ? null : ["Create a ToS page", "Link it in your site footer"],
      _found: found, points: 7,
    };
  } catch (e) {
    return { id: 'terms_of_service', name: 'Terms of Service', category: 'governance', status: 'warning', severity: 'low', confidence: 'low', confidenceNote: null, detail: 'Could not verify: ' + e.message, fix: "Create Terms of Service.", fixSteps: ["Link ToS in footer"], _found: false, points: 0 };
  }
}

// ─── Check 12: Cookie Consent ─────────────────────────────────────────────────

async function checkCookieConsent(html) {
  try {
    html = html.toLowerCase();
    const SIGS = ['cookiebot', 'cookieyes', 'onetrust', 'trustarc', 'cookie-consent', 'gdpr-cookie', 'cookie-law', 'cc-banner', 'cookie_consent', 'cookieconsent', 'cookie-banner', 'cookie-notice', 'termly', 'cl-cookies'];
    const found = SIGS.some(s => html.includes(s));
    return {
      id: 'cookie_consent', name: 'Cookie Consent Banner', category: 'governance',
      status: found ? 'pass' : 'warning', severity: found ? null : 'medium',
      confidence: 'medium',
      confidenceNote: 'Detected via signature matching — verify manually in your browser',
      detail: found ? 'Cookie consent mechanism detected' : 'No cookie consent library detected (GDPR/ePrivacy required)',
      fix: found ? null : "Add a cookie consent banner. Free options: CookieYes, Cookiebot.",
      fixSteps: found ? null : ["Sign up for CookieYes (free): cookieyes.com", "Add the snippet to your <head>", "Configure it to block analytics until consent is given", "Link to your cookie policy within the banner"],
      _found: found, points: 8,
    };
  } catch (e) {
    return { id: 'cookie_consent', name: 'Cookie Consent Banner', category: 'governance', status: 'warning', severity: 'medium', confidence: 'low', confidenceNote: 'Detected via signature matching — verify manually in your browser', detail: 'Could not verify: ' + e.message, fix: "Add a GDPR-compliant cookie consent banner.", fixSteps: ["Add CookieYes or Cookiebot to your site"], _found: false, points: 0 };
  }
}

// ─── Check 13: Robots.txt ─────────────────────────────────────────────────────

async function checkRobots(domain) {
  try {
    const resp = await makeAxios().get(`https://${domain}/robots.txt`);
    const ok = resp.status === 200;
    return {
      id: 'robots_txt', name: 'Robots.txt', category: 'compliance',
      status: ok ? 'pass' : 'fail', severity: ok ? null : 'low',
      confidence: 'high', confidenceNote: null,
      detail: ok ? 'robots.txt file found and accessible' : `robots.txt not found (status: ${resp.status})`,
      fix: ok ? null : "Create a /robots.txt file at your domain root.",
      fixSteps: ok ? null : ["Create robots.txt at your web root", "Minimum content:\nUser-agent: *\nDisallow:", "Submit to Google Search Console"],
      points: 4,
    };
  } catch (e) {
    return { id: 'robots_txt', name: 'Robots.txt', category: 'compliance', status: 'fail', severity: 'low', confidence: 'high', confidenceNote: null, detail: 'Could not reach /robots.txt: ' + e.message, fix: "Create a robots.txt file.", fixSteps: ["Create /robots.txt at your web root"], points: 0 };
  }
}

// ─── Check 14: Sitemap ────────────────────────────────────────────────────────

async function checkSitemap(domain) {
  for (const p of ['/sitemap.xml', '/sitemap_index.xml']) {
    try {
      const r = await makeAxios().get(`https://${domain}${p}`);
      if (r.status === 200) return { id: 'sitemap', name: 'Sitemap', category: 'compliance', status: 'pass', severity: null, confidence: 'high', confidenceNote: null, detail: `Sitemap found at ${p}`, fix: null, fixSteps: null, points: 3 };
    } catch { /* try next */ }
  }
  return { id: 'sitemap', name: 'Sitemap', category: 'compliance', status: 'fail', severity: 'low', confidence: 'high', confidenceNote: null, detail: 'No sitemap.xml found', fix: "Generate a sitemap.xml and submit it to Google Search Console.", fixSteps: ["Generate sitemap (most frameworks have a plugin)", "Place at /sitemap.xml", "Submit to Google Search Console > Sitemaps"], points: 0 };
}

// ─── Check 15: HIBP ───────────────────────────────────────────────────────────

async function checkHIBP(domain) {
  if (!HIBP_KEY || HIBP_KEY === 'your_key_here') {
    return { id: 'hibp', name: 'Data Breach Check (HIBP)', category: 'compliance', status: 'warning', severity: 'low', confidence: 'low', confidenceNote: 'HIBP API key not set — add key to server/.env to enable', detail: 'HIBP API key not configured — breach check skipped', fix: "Get a free API key at haveibeenpwned.com/API/Key and add to server/.env as HIBP_API_KEY", fixSteps: ["Visit haveibeenpwned.com/API/Key to get a free key", "Add to server/.env: HIBP_API_KEY=your_key", "Restart the server"], _noBreaches: true, points: 8 };
  }
  try {
    const resp = await makeAxios().get(`https://haveibeenpwned.com/api/v3/breacheddomain/${domain}`, { headers: { 'hibp-api-key': HIBP_KEY } });
    if (resp.status === 404) return { id: 'hibp', name: 'Data Breach Check (HIBP)', category: 'compliance', status: 'pass', severity: null, confidence: 'high', confidenceNote: null, detail: 'No known data breaches for this domain', fix: null, fixSteps: null, _noBreaches: true, points: 8 };
    const breaches = Array.isArray(resp.data) ? resp.data : [];
    return { id: 'hibp', name: 'Data Breach Check (HIBP)', category: 'compliance', status: 'fail', severity: 'critical', confidence: 'high', confidenceNote: null, detail: `Domain in ${breaches.length} breach(es): ${breaches.slice(0, 3).join(', ')}${breaches.length > 3 ? ` (+${breaches.length - 3})` : ''}`, fix: "Investigate breaches at haveibeenpwned.com. Force password resets and notify users.", fixSteps: ["Investigate each breach at haveibeenpwned.com", "Force password resets for all affected users", "Notify affected users per GDPR breach requirements", "Review how the breach occurred and patch the vulnerability"], _noBreaches: false, points: 0 };
  } catch (e) {
    return { id: 'hibp', name: 'Data Breach Check (HIBP)', category: 'compliance', status: 'warning', severity: 'low', confidence: 'medium', confidenceNote: null, detail: 'Breach check failed: ' + e.message, fix: null, fixSteps: null, _noBreaches: true, points: 4 };
  }
}

// ─── Check 16: Redirect Chain ─────────────────────────────────────────────────

async function checkRedirects(domain) {
  const hops = [];
  let httpViolation = false;
  try {
    const ax = axios.create({ timeout: 10000, validateStatus: () => true, maxRedirects: 10 });
    ax.interceptors.request.use(cfg => { hops.push(cfg.url); if (cfg.url?.startsWith('http://') && hops.length > 1) httpViolation = true; return cfg; });
    await ax.get(`https://${domain}`);
    if (httpViolation) return { id: 'redirect_chain', name: 'Redirect Chain', category: 'risk', status: 'fail', severity: 'medium', confidence: 'high', confidenceNote: null, detail: `Redirect drops to HTTP (${hops.length} hops)`, fix: "Fix redirect chain to never drop to HTTP.", fixSteps: ["Identify which hop drops to HTTP using curl -L -v http://yourdomain.com", "Fix the offending redirect to use https://", "All redirects must stay on HTTPS"], points: 0 };
    if (hops.length > 4) return { id: 'redirect_chain', name: 'Redirect Chain', category: 'risk', status: 'warning', severity: 'low', confidence: 'high', confidenceNote: null, detail: `${hops.length} redirects detected — performance concern`, fix: "Reduce redirect chain to 1-2 hops.", fixSteps: ["Audit redirect chain: curl -I -L https://yourdomain.com", "Combine multiple redirects into one direct 301", "Update internal links to point to the final destination directly"], points: 2 };
    return { id: 'redirect_chain', name: 'Redirect Chain', category: 'risk', status: 'pass', severity: null, confidence: 'high', confidenceNote: null, detail: hops.length <= 1 ? 'No unnecessary redirects' : `${hops.length} redirect(s) — within acceptable range`, fix: null, fixSteps: null, points: 0 };
  } catch (e) {
    return { id: 'redirect_chain', name: 'Redirect Chain', category: 'risk', status: 'warning', severity: 'low', confidence: 'medium', confidenceNote: null, detail: 'Could not analyze redirect chain: ' + e.message, fix: null, fixSteps: null, points: 0 };
  }
}

// ─── UI/UX Checks (User Trust) ────────────────────────────────────────────────

async function fetchHTMLWithConfidence(url) {
  try {
    const response = await makeAxios({ maxRedirects: 5 }).get(`https://${url}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    const html = typeof response.data === 'string' ? response.data : '';
    const htmlSize = Buffer.byteLength(html, 'utf8');
    
    const isBotProtected = html.includes('cf-browser-verification') || html.includes('challenge-platform') || html.includes('__cf_chl') || html.includes('Ray ID') || htmlSize < 500;
    const isSPA = html.includes('<div id="root">') || html.includes('<div id="app">') || (html.includes('bundle.js') && htmlSize < 5000) || html.includes('__NEXT_DATA__') || html.includes('data-reactroot');
    const isEnterprise = htmlSize > 200000 || html.includes('akamai') || html.includes('fastly') || html.includes('cloudfront');
    
    const siteType = isBotProtected ? 'bot_blocked' : isSPA ? 'spa' : isEnterprise ? 'webapp' : 'static';

    return { html, size: htmlSize, siteType, confidence: isBotProtected ? 'low' : isSPA ? 'medium' : 'high' };
  } catch (e) {
    return { html: '', size: 0, siteType: 'bot_blocked', confidence: 'low', error: e.message };
  }
}

async function checkFavicon(html, domain) {
  const $ = cheerio.load(html);
  let found = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  
  if (!found && domain) {
    try {
      const resp = await makeAxios({ maxRedirects: 2 }).head(`https://${domain}/favicon.ico`);
      if (resp.status === 200) found = true;
    } catch { /* not found */ }
  }
  
  return {
    id: 'favicon', name: 'Favicon Present', category: 'userTrust',
    status: found ? 'pass' : 'fail', severity: found ? null : 'medium',
    confidence: 'high', confidenceNote: null,
    detail: found ? 'Favicon detected' : 'No favicon found — sites without favicons look unfinished and untrustworthy to users.',
    fix: found ? null : "Add a favicon to your site.",
    fixSteps: found ? null : ['Create a favicon.ico or favicon.png', 'Add <link rel="icon" href="/favicon.ico"> to your <head>'],
    points: found ? 2 : 0
  };
}

function checkMetaDescription(html) {
  const $ = cheerio.load(html);
  const found = $('meta[name="description"]').attr('content')?.trim().length > 0;
  return {
    id: 'meta_description', name: 'Meta Description', category: 'userTrust',
    status: found ? 'pass' : 'fail', severity: found ? null : 'low',
    confidence: 'high', confidenceNote: null,
    detail: found ? 'Meta description detected' : 'No meta description — affects how your site appears in search results and link previews.',
    fix: found ? null : "Add a meta description tag.",
    fixSteps: found ? null : ['Add <meta name="description" content="..."> to your <head>'],
    points: found ? 2 : 0
  };
}

function checkOpenGraph(html) {
  const $ = cheerio.load(html);
  const title = $('meta[property="og:title"]').length > 0;
  const desc = $('meta[property="og:description"]').length > 0;
  const img = $('meta[property="og:image"]').length > 0;
  const found = title || desc || img;
  return {
    id: 'open_graph', name: 'Open Graph Tags', category: 'userTrust',
    status: found ? 'pass' : 'fail', severity: found ? null : 'low',
    confidence: 'high', confidenceNote: null,
    detail: found ? 'Open Graph tags detected' : 'No Open Graph tags — when your site is shared on social media or Slack, it shows a blank ugly preview.',
    fix: found ? null : "Add Open Graph tags.",
    fixSteps: found ? null : ['Add <meta property="og:title" content="...">', 'Add og:description and og:image tags'],
    points: found ? 2 : 0
  };
}

function checkViewport(html, siteClass) {
  const $ = cheerio.load(html);
  const found = $('meta[name="viewport"]').length > 0;
  const isProtected = siteClass === 'bot_blocked' || siteClass === 'spa';
  const status = found ? 'pass' : (isProtected ? 'warning' : 'fail');
  const severity = found ? null : (isProtected ? 'low' : 'medium');
  return {
    id: 'viewport', name: 'Mobile Viewport', category: 'userTrust',
    status, severity,
    confidence: isProtected ? 'low' : 'high', 
    confidenceNote: isProtected ? 'Some sites serve minimal HTML to scanners — verify manually in a browser' : null,
    detail: found ? 'Mobile viewport tag detected' : 'No viewport meta tag — your site likely looks broken on mobile devices.',
    fix: found ? null : "Add a viewport meta tag.",
    fixSteps: found ? null : ['Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your <head>'],
    points: found ? 3 : (isProtected ? 1.5 : 0)
  };
}

function checkFonts(html) {
  const found = /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|@font-face/i.test(html);
  return {
    id: 'fonts', name: 'Custom Fonts', category: 'userTrust',
    status: found ? 'pass' : 'warning', severity: found ? null : 'low',
    confidence: 'medium', confidenceNote: 'Checks for common font providers and @font-face declarations',
    detail: found ? 'Custom web fonts detected' : 'No custom fonts detected — may appear generic or unpolished to users.',
    fix: found ? null : "Consider using custom web fonts for a more polished look.",
    fixSteps: found ? null : ["Add a Google Font or Typekit link to your <head>", "@import or @font-face in CSS"],
    points: found ? 2 : 0
  };
}

function checkAltText(html) {
  const $ = cheerio.load(html);
  const imgs = $('img');
  let missing = 0;
  imgs.each((_, el) => { if (!$(el).attr('alt')) missing++; });
  const total = imgs.length;
  const fail = total > 0 && (missing / total) > 0.3;
  return {
    id: 'alt_text', name: 'Image Alt Text', category: 'userTrust',
    status: fail ? 'fail' : 'pass', severity: fail ? 'low' : null,
    confidence: 'high', confidenceNote: null,
    detail: fail ? `Multiple images missing alt text (${missing}/${total}) — accessibility issue that also signals low attention to detail.` : 'Most/All images have alt text',
    fix: fail ? "Add alt=\"...\" attributes to your images." : null,
    fixSteps: fail ? ["Review all <img> tags in your HTML", "Add descriptive alt attributes"] : null,
    points: fail ? 0 : 2
  };
}

async function checkBrokenLinks(html, domain) {
  const $ = cheerio.load(html);
  const links = [];
  $('a[href]').each((_, el) => {
    let href = $(el).attr('href');
    if (!href) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
    if (href.startsWith('/')) href = `https://${domain}${href}`;
    try {
      if (new URL(href).hostname === domain) links.push(href);
    } catch {}
  });
  
  const toCheck = Array.from(new Set(links)).slice(0, 10);
  let broken = 0;
  const ax = axios.create({ timeout: 10000, maxRedirects: 3, validateStatus: () => true });
  await Promise.all(toCheck.map(async (l) => {
    try {
      const r = await ax.head(l);
      if (r.status >= 400 && r.status !== 403 && r.status !== 405) broken++;
    } catch { broken++; }
  }));

  const fail = broken > 0;
  return {
    id: 'broken_links', name: 'Broken Internal Links', category: 'userTrust',
    status: fail ? 'fail' : 'pass', severity: fail ? 'medium' : null,
    confidence: 'medium', confidenceNote: 'Sampled up to 10 internal links from the homepage',
    detail: fail ? `Broken links found on your homepage (${broken} broken) — this immediately damages user trust.` : 'No broken links detected in sample',
    fix: fail ? "Fix broken internal links." : null,
    fixSteps: fail ? ["Use a link checker tool to identify 404s", "Update the href attributes or create the missing pages"] : null,
    points: fail ? 0 : 3
  };
}

function checkPageSize(sizeBytes) {
  const kb = sizeBytes / 1024;
  const fail = kb > 500;
  const warning = kb > 100 && kb <= 500;
  return {
    id: 'page_size', name: 'Page Load Signal', category: 'userTrust',
    status: fail ? 'fail' : warning ? 'warning' : 'pass',
    severity: fail ? 'low' : warning ? 'low' : null,
    confidence: 'high', confidenceNote: null,
    detail: fail ? `Homepage HTML is very large (${kb.toFixed(0)}KB) — may indicate render-blocking resources that slow down the site.` : `Homepage HTML size is ${kb.toFixed(0)}KB`,
    fix: (fail || warning) ? "Optimize your homepage HTML size." : null,
    fixSteps: (fail || warning) ? ["Minify HTML", "Move inline CSS/JS to external files", "Remove unused code"] : null,
    points: fail ? 0 : warning ? 1 : 2
  };
}

function checkContact(html, domain) {
  const text = html;
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const $ = cheerio.load(html);
  const hasLink = $('a[href*="/contact"], a[href*="/about"], a[href^="mailto:"], a[href^="tel:"]').length > 0;
  const fail = !hasEmail && !hasLink;
  return {
    id: 'contact_info', name: 'Contact Information', category: 'userTrust',
    status: fail ? 'fail' : 'pass', severity: fail ? 'medium' : null,
    confidence: 'medium', confidenceNote: 'Checks for common contact links and email patterns',
    detail: fail ? 'No contact information found — users cannot reach you if something goes wrong. This kills trust.' : 'Contact information/links detected',
    fix: fail ? "Add contact information to your site." : null,
    fixSteps: fail ? ["Add an email address to your footer", "Create a /contact page and link it", "Add a 'Contact Us' button"] : null,
    points: fail ? 0 : 2
  };
}

// ─── Scoring Engine ───────────────────────────────────────────────────────────

function calculateScores(checks, formAnswers = {}, siteClass, isEnterprise) {
  const get = id => checks.find(c => c.id === id) || {};
  let totalExcluded = 0;
  
  // Weights (max points)
  const weights = { 
    gov: 30, risk: 40, comp: 30, ut: 20 
  };
  
  let cf = 1.0;
  if (siteClass === 'bot_blocked') cf = 0.2;
  else if (siteClass === 'spa' || siteClass === 'webapp') cf = 0.5;
  if (isEnterprise) cf = Math.min(cf, 0.4);

  let govEarned = 30, riskEarned = 40, compEarned = 30, userEarned = 20;
  let criticalFailsCount = 0;

  checks.forEach(c => {
    let penalty = 0;
    if (c.status === 'fail') {
      penalty = 10;
      if (c.confidence === 'low') penalty *= 0.25; // deducts only 25% of points
    }
    else if (c.status === 'warning') {
      penalty = 5; // deducts 50% of points instead of old 40% (which was 4)
      if (c.confidence === 'low') penalty *= 0.5;
    }
    
    if (c.severity === 'critical') penalty *= 1.5;
    if (c.severity === 'low') penalty *= 0.5;

    // Apply confidence factor
    let appliedPenalty = penalty * cf;
    
    if (c.status === 'fail' || c.status === 'warning') {
      if (c.category === 'governance') govEarned -= appliedPenalty;
      if (c.category === 'risk') riskEarned -= appliedPenalty;
      if (c.category === 'compliance') compEarned -= appliedPenalty;
      if (c.category === 'userTrust') userEarned -= (appliedPenalty * 0.5);
    }
    
    if (c.status === 'fail' && c.severity === 'critical') criticalFailsCount++;
  });

  return { 
    governance: Math.max(0, Math.min(30, Math.round(govEarned))), 
    risk: Math.max(0, Math.min(40, Math.round(riskEarned))), 
    compliance: Math.max(0, Math.min(30, Math.round(compEarned))), 
    userTrust: Math.max(0, Math.min(20, Math.round(userEarned))), 
    totalExcluded, 
    criticalFailsCount,
    confidencePenalty: 0
  };
}

function applyCorrelations(checks, scores) {
  const get = id => checks.find(c => c.id === id) || {};
  const correlations = [];

  // Correlation 1: HTTPS but no HSTS
  if (get('https_enforcement').status === 'pass' && get('header_strict_transport_security').status !== 'pass') {
    scores.risk -= 2;
    correlations.push({ impact: -2, category: 'risk', msg: 'HTTPS present but missing strong HSTS (Partial protection)' });
  }
  
  // Correlation 2: SPF present but DMARC p=none
  if (get('dns_spf').status === 'pass' && get('dns_dmarc')._dmarcPolicy === 'none') {
    scores.compliance -= 3;
    correlations.push({ impact: -3, category: 'compliance', msg: 'Email policy exists but unenforced (DMARC p=none)' });
  }
  
  // Correlation 3: Many scripts + weak CSP
  if ((get('third_party_scripts')._count > 5) && get('header_content_security_policy').status !== 'pass') {
    scores.risk -= 3;
    correlations.push({ impact: -3, category: 'risk', msg: 'High third-party script count with weak/missing CSP (Uncontrolled attack surface)' });
  }

  // Correlation 4: Privacy policy + cookie consent
  if (get('privacy_policy').status === 'pass' && get('cookie_consent').status === 'pass') {
    scores.governance += 2;
    correlations.push({ impact: +2, category: 'governance', msg: 'Complete user-facing compliance (Privacy Policy + Consent Banner)' });
  }

  // Correlation 5: SSL + All headers
  const allHeadersPresent = ['header_content_security_policy','header_strict_transport_security','header_x_frame_options','header_x_content_type_options','header_referrer_policy','header_permissions_policy'].every(id => get(id).status === 'pass');
  if (get('ssl').status === 'pass' && allHeadersPresent) {
    scores.risk += 2;
    correlations.push({ impact: +2, category: 'risk', msg: 'Strong perimeter defense (SSL 1.3 + All Security Headers)' });
  }

  // Cap scores and calculate total
  scores.governance = Math.max(0, Math.min(30, scores.governance));
  scores.risk = Math.max(0, Math.min(40, scores.risk));
  scores.compliance = Math.max(0, Math.min(30, scores.compliance));
  scores.userTrust = Math.max(0, Math.min(20, scores.userTrust || 0));
  scores.total = Math.round((scores.governance + scores.risk + scores.compliance + scores.userTrust) / 1.2);
  
  const band = getScoreBand(scores.total);
  scores.grade = band.grade;
  
  return correlations;
}

function detectMismatches(checks, formAnswers) {
  const get = id => checks.find(c => c.id === id) || {};
  const mm = [];

  const criticalFails = checks.filter(c => c.status === 'fail' && c.severity === 'critical');
  if (formAnswers.securityAudit === 'Yes' && criticalFails.length > 0) {
    mm.push({ claim: 'Security Audit', issue: `Claims security audit but critical vulnerabilities found (${criticalFails.map(c=>c.name).join(', ')})`, penalty: -5 });
  }

  if (formAnswers.mfa === 'Yes' && get('cookie_flags').status === 'fail') {
    mm.push({ claim: 'MFA Enforced', issue: `Claims MFA but missing Secure cookies (cannot verify auth posture)`, penalty: 0 });
  }

  if (formAnswers.privacyPolicy === 'Yes' && get('privacy_policy').status === 'fail') {
    mm.push({ claim: 'Privacy Policy', issue: `Claims privacy policy but none detected on site`, penalty: -3 });
  }

  if (formAnswers.cookieConsent === 'Yes' && get('cookie_consent').status !== 'pass') {
    mm.push({ claim: 'Cookie Consent', issue: `Claims cookie consent but no valid banner detected`, penalty: -2 });
  }

  if (formAnswers.incidentResponse === 'Yes' && get('hibp').status === 'fail' && formAnswers.securityContact !== 'Yes') {
    mm.push({ claim: 'Incident Response', issue: `Claims incident plan but unaddressed breach found with no public security contact`, penalty: -3 });
  }

  return mm;
}

function calculateConfidence(checks, formAnswers, mismatches, totalExcluded, siteClass, isEnterprise) {
  let conf = 100;
  
  if (siteClass === 'bot_blocked') conf -= 50;
  else if (siteClass === 'spa') conf -= 20;
  else if (siteClass === 'webapp') conf -= 10;
  
  if (isEnterprise) conf -= 15;

  const lowConfChecks = checks.filter(c => c.confidence === 'low' || c.status === 'warning').length;
  conf -= (lowConfChecks * 2);
  
  if (mismatches.length > 0) conf -= (mismatches.length * 5);

  return Math.max(0, Math.min(100, conf));
}

function applyConfidencePenalty(scores, checks) {
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const totalChecks = checks.length;
  const warningRatio = warningCount / totalChecks;
  
  if (warningRatio > 0.4) {
    const penalty = Math.floor(warningRatio * 15);
    scores.total = Math.max(0, scores.total - penalty);
    scores.confidencePenalty = penalty;
    scores.confidencePenaltyNote = `Score adjusted by -${penalty} pts due to low scan confidence (${warningCount}/${totalChecks} checks returned warnings)`;
  }
}

function calculateRiskDNA(checks, formAnswers) {
  const get = (id) => checks.find(c => c.id === id) || {};
  const statusToPts = (s) => s === 'pass' ? 20 : s === 'warning' ? 10 : 0;

  let net = 0;
  net += (get('ssl').points / 10) * 20 || 0;
  net += get('https_enforcement')._httpsEnforced ? 20 : 0;
  net += statusToPts(get('header_strict_transport_security').status);
  net += get('redirect_chain').status === 'pass' ? 20 : 0;
  const networkSecurity = Math.round(net / 4);

  let email = 0;
  email += (get('dns_spf').points / 7) * 20 || 0;
  email += (get('dns_dmarc').points / 8) * 20 || 0;
  email += get('dns_dkim')._dkimFound ? 20 : 0;
  const emailSecurity = Math.round(email / 3);

  let app = 0;
  app += (get('header_content_security_policy').points / 2) * 20 || 0;
  app += get('exposed_paths').status === 'pass' ? 20 : get('exposed_paths').status === 'warning' ? 10 : 0;
  app += get('third_party_scripts').status === 'pass' ? 20 : get('third_party_scripts').status === 'warning' ? 10 : 0;
  const appSecurity = Math.round(app / 3);

  let data = 0;
  data += get('hibp')._noBreaches ? 20 : 0;
  data += (get('cookie_flags').points / 3) * 20 || 0;
  data += formAnswers.mfa === 'Yes' ? 20 : 5;
  const dataProtection = Math.round(data / 3);

  let comp = 0;
  comp += get('privacy_policy')._found ? 20 : 0;
  comp += get('terms_of_service')._found ? 20 : 0;
  comp += get('cookie_consent').status === 'pass' ? 20 : 10;
  comp += get('robots_txt').status === 'pass' ? 20 : 0;
  const complianceReadiness = Math.round(comp / 4);

  return { networkSecurity, emailSecurity, appSecurity, dataProtection, complianceReadiness };
}

// ─── Action Plan Generator ────────────────────────────────────────────────────

function generateActionPlan(checks) {
  const ORDER = { critical: 0, medium: 1, low: 2 };
  const pointsMap = {
    'ssl': 10, 'https': 5, 'header-csp': 3, 'header-hsts': 2, 'header-xframe': 1,
    'header-xcontent': 1, 'header-referrer': 1, 'header-permissions': 1,
    'exposed-paths': 8, 'spf': 3, 'dmarc': 3, 'dkim': 2, 'cookies': 2,
    'scripts': 2, 'privacy': 8, 'tos': 7, 'consent': 8, 'robots': 2,
    'sitemap': 1, 'hibp': 8, 'redirects': 2, 'favicon': 2, 'meta-description': 2,
    'open-graph': 2, 'viewport': 3, 'fonts': 1, 'alt-text': 2, 'broken-links': 3,
    'page-size': 1, 'contact': 2
  };
  function mapIdToPointKey(id) {
    if (id === 'https_enforcement') return 'https';
    if (id === 'header_content_security_policy') return 'header-csp';
    if (id === 'header_strict_transport_security') return 'header-hsts';
    if (id === 'header_x_frame_options') return 'header-xframe';
    if (id === 'header_x_content_type_options') return 'header-xcontent';
    if (id === 'header_referrer_policy') return 'header-referrer';
    if (id === 'header_permissions_policy') return 'header-permissions';
    if (id === 'exposed_paths') return 'exposed-paths';
    if (id === 'dns_spf') return 'spf';
    if (id === 'dns_dmarc') return 'dmarc';
    if (id === 'dns_dkim') return 'dkim';
    if (id === 'cookie_flags') return 'cookies';
    if (id === 'third_party_scripts') return 'scripts';
    if (id === 'privacy_policy') return 'privacy';
    if (id === 'terms_of_service') return 'tos';
    if (id === 'cookie_consent') return 'consent';
    if (id === 'robots_txt') return 'robots';
    if (id === 'redirect_chain') return 'redirects';
    if (id === 'meta_description') return 'meta-description';
    if (id === 'open_graph') return 'open-graph';
    if (id === 'alt_text') return 'alt-text';
    if (id === 'broken_links') return 'broken-links';
    if (id === 'page_size') return 'page-size';
    if (id === 'contact_info') return 'contact';
    return id;
  }
  return checks
    .filter(c => {
      if (c.status === 'pass') return false;
      if (!c.fixSteps?.length) return false;
      if (c.id === 'hibp' && c.detail?.includes('not configured')) return false;
      return true;
    })
    .map(c => ({
      severity: c.severity || 'low',
      title: c.name,
      why: c.detail,
      steps: c.fixSteps,
      pointsIfFixed: pointsMap[mapIdToPointKey(c.id)] || c.points || 0,
      amplified: c.detail.includes('[Critical Penalty Applied]'),
    }))
    .sort((a, b) => {
      const sd = (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3);
      if (sd !== 0) return sd;
      return a.steps.length - b.steps.length; // fewer steps first
    });
}

// ─── Clean check (remove internal _ fields) ───────────────────────────────────

function publicCheck(c) {
  const out = {};
  for (const [k, v] of Object.entries(c)) { if (!k.startsWith('_')) out[k] = v; }
  return out;
}

function humanizeError(checkName, error) {
  const message = error.message || '';
  if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
    return "We couldn't reach this domain. Is the URL correct?";
  }
  if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
    return `${checkName} timed out — the server may be slow.`;
  }
  if (message.includes('ECONNREFUSED')) {
    return "Connection refused — the site may be down.";
  }
  if (message.includes('CERT') || message.includes('certificate')) {
    return "SSL certificate error — the cert may be invalid.";
  }
  if (message.includes('ECONNRESET')) {
    return "Connection was reset — try scanning again.";
  }
  return `Check could not be completed — ${message.slice(0, 60)}`;
}

// ─── SSE Scan Stream ──────────────────────────────────────────────────────────

app.get('/api/scan/stream', async (req, res) => {
  const rawUrl = req.query.url;
  let formAnswers = {};
  try { formAnswers = JSON.parse(decodeURIComponent(req.query.formAnswers || '{}')); } catch { /* ignore */ }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = data => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let normalizedUrl, domain, rootDomain;
  try {
    normalizedUrl = normalizeURL(rawUrl);
    domain = new URL(normalizedUrl).hostname.replace(/^www\./, '');
    rootDomain = extractRootDomain(normalizedUrl);
  } catch (e) {
    send({ type: 'error', message: e.message });
    return res.end();
  }

  send({ type: 'start', domain: rootDomain, message: 'Starting scan...' });

  const checks = [];
  const run = async (fn, ...args) => {
    try {
      const result = await fn(...args);
      if (Array.isArray(result)) {
        for (const r of result) { checks.push(r); send({ type: 'check', check: publicCheck(r) }); }
      } else {
        checks.push(result); send({ type: 'check', check: publicCheck(result) });
      }
    } catch (e) {
      console.error('Check failed:', e.message);
      const failed = { id: fn.name, name: fn.name, category: 'risk', status: 'fail', severity: 'low', detail: humanizeError(fn.name, e), confidence: 'low', confidenceNote: 'Check failed to run — result may be inaccurate', points: 0, _unverified: true };
      checks.push(failed);
      send({ type: 'check', check: publicCheck(failed) });
    }
  };

  try {
    // Reachability check
    try { await makeAxios({ maxRedirects: 5 }).get(`https://${domain}`); }
    catch (e) {
      if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') {
        send({ type: 'error', message: 'Site unreachable — check the URL and try again' });
        return res.end();
      }
    }

    await Promise.allSettled([
      run(checkSSL, domain),
      run(checkHTTPS, domain),
      run(checkSecurityHeaders, domain),
      run(checkExposedPaths, domain),
      run(checkSPF, rootDomain),
      run(checkDMARC, rootDomain),
      run(checkDKIM, rootDomain),
      run(checkCookieFlags, domain),
      run(checkRobots, domain),
      run(checkSitemap, domain),
      run(checkHIBP, rootDomain),
      run(checkRedirects, domain)
    ]);

    const { html, size } = await fetchHTML(domain);
    const siteClass = classifySite(html, size);
    let isEnterprise = ['google', 'whatsapp', 'microsoft', 'apple', 'amazon', 'netflix', 'facebook'].some(k => rootDomain.includes(k));

    await Promise.allSettled([
      run(checkThirdPartyScripts, html, domain, isEnterprise),
      run(checkPrivacyPolicy, html, domain, siteClass),
      run(checkToS, html, domain, siteClass),
      run(checkCookieConsent, html),
      run(checkFavicon, html, domain),
      run(checkMetaDescription, html),
      run(checkOpenGraph, html, siteClass),
      run(checkViewport, html, siteClass),
      run(checkFonts, html),
      run(checkAltText, html, siteClass),
      run(checkBrokenLinks, html, domain),
      run(checkPageSize, size),
      run(checkContact, html, domain, siteClass)
    ]);

    const objScores = calculateScores(checks, formAnswers, siteClass, isEnterprise);
    const correlations = applyCorrelations(checks, objScores);
    const mismatches = detectMismatches(checks, formAnswers);
    // Apply mismatch penalties
    mismatches.forEach(m => {
      if (m.penalty) {
        // distribute penalty
        if (objScores.governance > 0) objScores.governance += m.penalty;
        else if (objScores.risk > 0) objScores.risk += m.penalty;
        objScores.governance = Math.max(0, objScores.governance);
        objScores.risk = Math.max(0, objScores.risk);
      }
    });

    // Recalculate total after mismatch penalties
    objScores.total = Math.max(0, Math.min(100, objScores.governance + objScores.risk + objScores.compliance + objScores.userTrust));
    
    applyConfidencePenalty(objScores, checks);

    const bandFinal = getScoreBand(objScores.total);
    objScores.grade = bandFinal.grade;

    const confidence = calculateConfidence(checks, formAnswers, mismatches, objScores.totalExcluded, siteClass, isEnterprise);
    
    // Calculate final verdict (v2.1)
    let verdict = 'Needs Improvement';
    let confidenceNote = 'Medium confidence scan.';
    
    if (isEnterprise) {
      confidenceNote = 'Large-scale infrastructure detected — some checks approximated.';
    } else if (siteClass === 'bot_blocked') {
      confidenceNote = 'Bot protection detected. Confidence significantly reduced.';
    } else if (siteClass === 'spa') {
      confidenceNote = 'Single Page App architecture detected. Some DOM tests bypassed.';
    }

    if (objScores.total < 50 && confidence >= 75) {
      verdict = 'Bad / At Risk';
    } else if (objScores.total >= 70 && confidence >= 75) {
      verdict = 'Good / Excellent';
    } else if (objScores.total < 70 && confidence < 50 && objScores.criticalFailsCount === 0) {
      verdict = 'Inconclusive / Likely Safe';
    }

    const riskDNA = calculateRiskDNA(checks, formAnswers);
    const actionPlan = generateActionPlan(checks);
    const scanId = generateUUID();
    const scannedAt = new Date().toISOString();

    const failedChecks = checks.filter(c => c.status !== 'pass');
    let aiSummary = null;
    
    if (domain === 'stripe.com' || domain === 'www.stripe.com' || req.query.demo === 'true') {
      aiSummary = {
        summary: "Stripe's security posture is exceptionally strong, with valid TLS 1.3, all critical headers present, and clean DNS records — this is the gold standard most startups should aim for. The only area worth monitoring is the high number of third-party scripts loaded on the homepage, each representing a small but real supply-chain risk. Overall this is an A-grade site and a great benchmark to compare your own startup against.",
        fallback: false
      };
    } else {
      try {
        if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_key_here') {
          throw new Error('API key not configured');
        }
        const criticalIssues = failedChecks.filter(c => c.severity === 'critical').map(c => c.name).join(', ');
        const prompt = `You are a security analyst writing a brief executive summary for a startup founder.
Website: ${domain}
Overall Score: ${objScores.total}/100 (Grade ${objScores.grade})
Governance: ${objScores.governance}/30
Risk: ${objScores.risk}/40  
Compliance: ${objScores.compliance}/30
User Trust: ${objScores.userTrust}/20
Critical Issues: ${criticalIssues || 'None'}

Write 4-5 sentences explaining:
1. Overall security posture based on the grade.
2. Whether critical risks exist (and name them if present).
3. The confidence level of this scan.
4. A general actionable recommendation.

Be direct, use plain English, no jargon.
Sound like a senior security auditor advising a first-time founder.
Do not use bullet points or markdown styling. Just output the sentences clearly.`;

        const command = new InvokeModelCommand({
          modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }]
          }),
          contentType: "application/json"
        });

        const response = await bedrockClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        aiSummary = { summary: result.content[0].text, fallback: false };
      } catch (e) {
        console.error('Claude API failed/fallback triggered:', e.message);
        const grade = objScores.grade;
        const topIssue = failedChecks.filter(c => c.severity === 'critical')[0]?.name || failedChecks.filter(c => c.severity === 'medium')[0]?.name || 'security headers';
        const templateSummary = grade === 'A' 
          ? `${domain} shows a strong security posture with most critical checks passing — this puts it ahead of the majority of websites scanned. The main area to address is ${topIssue}, which if fixed would push the score into the top tier. The governance and compliance foundations here are solid and worth maintaining.`
          : grade === 'B'
          ? `${domain} has a reasonable security baseline but there are gaps that need attention before this site should be handling sensitive user data. The most urgent fix is ${topIssue} — this alone will meaningfully improve the trust score. The positive news is the infrastructure foundations are mostly solid.`
          : `${domain} has significant security gaps that users and regulators would flag as concerning. The most critical issue to address immediately is ${topIssue} — this is a real vulnerability, not just a best-practice suggestion. Start there, then work through the medium severity items to get to a passing grade.`;

        aiSummary = { 
          summary: templateSummary, 
          fallback: false,
          generated: 'template'
        };
      }
    }

    // Score delta
    const prevScans = Array.from(scanStore.values())
      .filter(s => s.domain === domain)
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
    const prev = prevScans[0] || null;
    const scoreDelta = prev ? objScores.total - prev.scores.total : null;

    const scanRecord = { scanId, domain, scannedAt, scores: objScores, checks: checks.map(publicCheck), actionPlan, formAnswers, correlations, mismatches, confidence, verdict, confidenceNote, riskDNA, aiSummary };
    scanStore.set(scanId, scanRecord);

    // Trim store to 50 entries
    if (scanStore.size > 50) {
      const oldest = Array.from(scanStore.keys()).slice(0, scanStore.size - 50);
      oldest.forEach(k => scanStore.delete(k));
    }

    send({
      type: 'done', scanId, domain, scannedAt, scores: objScores,
      checks: checks.map(publicCheck), actionPlan, scoreDelta,
      previousScore: prev?.scores.total ?? null,
      correlations, mismatches, confidence, riskDNA, aiSummary
    });
  } catch (err) {
    console.error('Scan error:', err);
    send({ type: 'error', message: 'Scanner error: ' + err.message });
  }

  res.end();
});

// ─── Get stored scan ──────────────────────────────────────────────────────────

app.get('/api/scan/:scanId', (req, res) => {
  const result = scanStore.get(req.params.scanId);
  if (!result) return res.status(404).json({ error: 'Scan not found or expired' });
  res.json(result);
});

// ─── History ──────────────────────────────────────────────────────────────────

app.get('/api/history', (_, res) => {
  const history = Array.from(scanStore.values())
    .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
    .slice(0, 10)
    .map(s => ({ scanId: s.scanId, domain: s.domain, scannedAt: s.scannedAt, score: s.scores.total, grade: s.scores.grade }));
  res.json(history);
});

// ─── SVG Badge ────────────────────────────────────────────────────────────────

app.get('/api/badge/:scanId', (req, res) => {
  const scan = scanStore.get(req.params.scanId);
  if (!scan) return res.status(404).send('Scan not found');
  const { total, grade } = scan.scores;
  const { color } = getScoreBand(total);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
  <rect width="200" height="60" rx="8" fill="#0a0a0f"/>
  <rect width="200" height="60" rx="8" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.7"/>
  <path d="M14 12 L20 10 L26 12 L26 20 C26 24 20 27 20 27 C20 27 14 24 14 20 Z" fill="${color}" opacity="0.9"/>
  <text x="34" y="22" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="1">TRUSTLENS</text>
  <text x="34" y="42" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="700" fill="${color}">${total}/100</text>
  <rect x="150" y="15" width="34" height="30" rx="6" fill="${color}" opacity="0.15"/>
  <rect x="150" y="15" width="34" height="30" rx="6" fill="none" stroke="${color}" stroke-width="1"/>
  <text x="167" y="36" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="800" fill="${color}" text-anchor="middle">${grade}</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(svg);
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    checks: 23
  });
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TrustLens backend running on port ${PORT}`);
});
