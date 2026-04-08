console.log('BASKET VERSION: NEW SELECTORS v2');
const { chromium } = require('playwright');

async function fillBasket(items, sessionCookies) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'en-GB',
    extraHTTPHeaders: {
      'Accept-Language': 'en-GB,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    }
  });

  // Convert Chrome extension cookie format to Playwright format
  const playwrightCookies = sessionCookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    expires: c.expirationDate || -1,
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
    sameSite: 'Lax'
  }));

  await context.addCookies(playwrightCookies);

  const page = await context.newPage();
  const results = [];

  for (const item of items) {
    const result = await addItem(page, item);
    results.push(result);
  }

  await browser.close();
  return results;
}

async function addItem(page, item) {
  const { url, quantity, name } = item;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Debug: log page title and URL to see what Playwright is seeing
    const title = await page.title();
    console.log(` [DEBUG] ${name}: page title = "${title}", url = ${page.url()}`);

    // Try to dismiss cookie banner if present
    const cookieBtn = page.locator('button:has-text("Accept all cookies"), button:has-text("Accept cookies"), button[data-auto="accept-cookies"]').first();
    try {
      await cookieBtn.click({ timeout: 2000 });
      console.log(` [DEBUG] ${name}: dismissed cookie banner`);
      await page.waitForTimeout(500);
    } catch (e) {
      // No cookie banner, continue
    }

    // Click the Add button using Tesco's data-auto attribute
    const addBtn = page.locator('button[data-auto="ddsweb-quantity-controls-add-button"]').first();
    await addBtn.waitFor({ timeout: 10000 });
    await addBtn.click();

    // Wait for the quantity controls to appear
    await page.waitForTimeout(1000);

    // If we need more than 1, set the quantity in the input field
    if (quantity > 1) {
      const qtyInput = page.locator('input[data-auto="ddsweb-quantity-controls-input"]').first();
      if (await qtyInput.isVisible({ timeout: 3000 })) {
        // Clear and type the quantity
        await qtyInput.fill(String(quantity));
        // Press Enter to confirm the quantity
        await qtyInput.press('Enter');
        await page.waitForTimeout(800);
      } else {
        // If no input visible, click the plus button to increase quantity
        const plusBtn = page.locator('button[data-auto="ddsweb-quantity-controls-add-button"]').first();
        for (var i = 1; i < quantity; i++) {
          await plusBtn.click();
          await page.waitForTimeout(400);
        }
      }
    }

    await page.waitForTimeout(600);

    console.log(` ✓ ${name} x${quantity}`);
    return { name, quantity, status: 'success' };

  } catch (err) {
    console.log(` ✗ ${name}: ${err.message}`);
    return { name, quantity, status: 'failed', error: err.message };
  }
}

module.exports = { fillBasket };
