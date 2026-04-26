const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const RefreshToken = require('../models/refreshToken');

puppeteer.use(StealthPlugin());

const router = express.Router();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const COLLEGE_REFRESH_URL = 'https://kmit-api.teleuniv.in/auth/refresh';

/**
 * POST /api/browser-login
 *
 * Smart login with two strategies:
 *
 * 1. FAST PATH (works on Vercel, ~1 second):
 *    Check MongoDB for a stored refresh_token → hit college /auth/refresh
 *    → return new access_token immediately. No browser needed.
 *    This covers 95%+ of logins for returning students.
 *
 * 2. BROWSER PATH (needs Chrome — local dev or Browserless.io):
 *    If no stored token or refresh expired → launch browser → Playwright
 *    fills credentials → Cloudflare Turnstile auto-solves on real Chrome
 *    → capture token from network → store refresh_token for next time.
 *
 * Set BROWSERLESS_TOKEN env var to use Browserless.io in production.
 * Without it: uses local system Chrome (headless:false, works only locally).
 */
router.post('/browser-login', async (req, res) => {
  const { username, password = 'Kmit123$' } = req.body;

  if (!username) {
    return res.status(400).json({ success: 0, error: 'username is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const emit = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // ── FAST PATH: try stored refresh token ──────────────────────────────
  try {
    const stored = await RefreshToken.findOne({ username });
    if (stored?.refresh_token) {
      emit('step', { step: 'verifying', message: 'Restoring saved session...' });

      try {
        const refreshRes = await axios.post(
          COLLEGE_REFRESH_URL,
          { refresh_token: stored.refresh_token },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        const newAccessToken = refreshRes.data?.access_token;
        if (newAccessToken && newAccessToken !== null) {
          // Update stored refresh token if the college rotated it
          const newRefresh = refreshRes.data?.refresh_token;
          if (newRefresh && newRefresh !== stored.refresh_token) {
            await RefreshToken.findOneAndUpdate(
              { username },
              { refresh_token: newRefresh, updatedAt: Date.now() }
            );
          }

          emit('done', {
            success: 1,
            token: newAccessToken,
            refresh_token: newRefresh || stored.refresh_token,
          });
          res.end();
          return;
        }
      } catch (_) {
        // Refresh failed (token expired) — fall through to browser login
      }
    }
  } catch (_) {
    // DB error — fall through to browser login
  }

  // ── BROWSER PATH ─────────────────────────────────────────────────────
  let browser;
  try {
    emit('step', { step: 'launching', message: 'Launching secure browser...' });

    if (process.env.BROWSERLESS_TOKEN) {
      // Production (Vercel): connect to Browserless.io remote Chrome
      browser = await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
      });
    } else {
      // Development: use local system Chrome
      browser = await puppeteer.launch({
        headless: false,
        channel: 'chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1,1',
          '--window-position=10000,10000',
        ],
        defaultViewport: null,
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );

    let capturedToken = null, capturedRefresh = null, loginError = null;

    page.on('response', async (response) => {
      if (response.url().includes('/auth/login')) {
        try {
          const body = await response.json();
          if (body.Error === false) {
            capturedToken   = body.access_token || body.token;
            capturedRefresh = body.refresh_token;
          } else {
            loginError = body.message || 'Auth failed';
          }
        } catch (_) {}
      }
    });

    emit('step', { step: 'navigating', message: 'Connecting to college portal...' });
    await page.goto('https://kmit.teleuniv.in/netra', {
      waitUntil: 'domcontentloaded',
      timeout: 40000,
    });

    emit('step', { step: 'filling', message: 'Entering credentials...' });
    await page.waitForSelector('#login_username', { timeout: 30000 });
    await page.type('#login_username', username, { delay: 60 });
    await page.type('#login_password', password, { delay: 60 });

    emit('step', { step: 'verifying', message: 'Waiting for verification...' });

    // Poll for Cloudflare Turnstile — real Chrome auto-solves in ~2-3s
    let solved = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const val = await page.evaluate(() => {
        const el = document.querySelector('input[name="cf-turnstile-response"]');
        return el ? el.value : '';
      });
      if (val && val.length > 20) {
        solved = true;
        break;
      }
    }

    if (!solved) {
      console.log('[turnstile] not solved after 10s — submitting anyway');
    }

    emit('step', { step: 'signing', message: 'Signing you in...' });
    await page.click('button[type="submit"]').catch(() => {});

    const deadline = Date.now() + 15000;
    while (!capturedToken && !loginError && Date.now() < deadline) {
      await sleep(300);
    }

    if (capturedToken) {
      // Store refresh token in MongoDB for fast path next login
      if (capturedRefresh) {
        await RefreshToken.findOneAndUpdate(
          { username },
          { refresh_token: capturedRefresh, updatedAt: Date.now() },
          { upsert: true }
        );
      }
      emit('done', { success: 1, token: capturedToken, refresh_token: capturedRefresh });
    } else {
      emit('error', { success: 0, error: loginError || 'Login timed out' });
    }

  } catch (err) {
    console.error('[browser-login] error:', err.message);
    emit('error', { success: 0, error: err.message });
  } finally {
    try { await browser.close(); } catch (_) {}
    res.end();
  }
});

module.exports = router;
