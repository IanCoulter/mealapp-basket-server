const express = require('express');
const { fillBasket } = require('./basket');

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS - allow requests from your Bubble app and extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Auth middleware
const API_KEY = process.env.API_KEY;

function authMiddleware(req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main endpoint - called by the Chrome extension
app.post('/fill-basket', authMiddleware, async (req, res) => {
  const { user_id, session_cookies, items } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  if (!session_cookies || !Array.isArray(session_cookies)) {
    return res.status(400).json({ error: 'session_cookies array is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  console.log(`[${user_id}] Basket fill request: ${items.length} items`);

  try {
    const results = await fillBasket(items, session_cookies);
    const succeeded = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');

    console.log(`[${user_id}] Complete: ${succeeded.length} added, ${failed.length} failed`);

    return res.json({
      success: true,
      total: results.length,
      added: succeeded.length,
      failed: failed.length,
      results
    });
  } catch (err) {
    console.error(`[${user_id}] Error:`, err.message);
    return res.status(500).json({
      error: 'Basket fill failed',
      detail: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
