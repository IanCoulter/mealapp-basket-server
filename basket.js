console.log('BASKET VERSION: NEW SELECTORS v2');
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

    // Click the Add button using Tesco's data-auto attribute
    const addBtn = page.locator('button[data-auto="ddsweb-quantity-controls-add-button"]').first();
    await addBtn.waitFor({ timeout: 8000 });
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
