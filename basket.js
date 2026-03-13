const { chromium } = require('playwright');

async function fillBasket(items, sessionCookies) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

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

    // Set quantity if more than 1
    if (quantity > 1) {
      const qtyInput = page.locator([
        'input[data-testid="quantity-input"]',
        'input[name="quantity"]',
        'input[type="number"]'
      ].join(', ')).first();

      if (await qtyInput.isVisible()) {
        await qtyInput.fill(String(quantity));
      }
    }

    // Click add to basket
    const addButton = page.locator([
      'button[data-testid="add-to-trolley-button"]',
      'button:has-text("Add to trolley")',
      'button:has-text("Add")'
    ].join(', ')).first();

    await addButton.waitFor({ timeout: 5000 });
    await addButton.click();
    await page.waitForTimeout(600);

    console.log(` ✓ ${name} x${quantity}`);
    return { name, quantity, status: 'success' };

  } catch (err) {
    console.log(` ✗ ${name}: ${err.message}`);
    return { name, quantity, status: 'failed', error: err.message };
  }
}

module.exports = { fillBasket };
