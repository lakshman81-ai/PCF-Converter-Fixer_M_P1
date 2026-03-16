const { test, expect } = require('@playwright/test');

test('test smart fixer and canvas formatting', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Load mock data
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'mock.pcf',
    mimeType: 'text/plain',
    buffer: Buffer.from(`ISOGEN-FILES ISOGEN.FLS
UNITS-BORE INCH
UNITS-CO-ORDS MM
UNITS-WEIGHT KGS
PIPELINE-REFERENCE MOCK-LINE-001
PIPE
    ENDPOINT   0.0000    0.0000    0.0000    10.0000
    ENDPOINT   1000.0000 0.0000    0.0000    10.0000
PIPE
    ENDPOINT   1020.0000 0.0000    0.0000    10.0000
    ENDPOINT   2000.0000 0.0000    0.0000    10.0000
PIPE
    ENDPOINT   3856.1000 0.0000    0.0000    10.0000
    ENDPOINT   5000.0000 0.0000    0.0000    10.0000
PIPE
    ENDPOINT   4000.0000 0.0000    0.0000    10.0000
    ENDPOINT   6000.0000 0.0000    0.0000    10.0000
REDUCER
    ENDPOINT   7000.0000 0.0000    0.0000    10.0000
    ENDPOINT   8000.0000 0.0000    0.0000    8.0000
PIPE
    ENDPOINT   8000.0000 0.0000    0.0000    10.0000
    ENDPOINT   9000.0000 0.0000    0.0000    10.0000`)
  });

  // Switch to Core processor
  await page.getByText('Core processor').click();

  // Wait for loading to finish
  await page.waitForTimeout(500);

  // Run Phase 1
  // We need to click "Core processor" again to get out of Data Table if needed?
  // Wait, the status bar action for phase 1 is only shown in Stage 2.
  // Stage 2 isn't active by default maybe? The test clicked "Core processor", imported mock data.
  // In `Core processor`, there's no "Stage 2: Validation" tab, it's inside `Data Table`.
  await page.getByText('Data Table').click();
  await page.getByText('Stage 2: Topology & Fixing').click();
  await page.waitForTimeout(500);

  // Pull data from Stage 1 into Stage 2
  await page.getByText('Pull Data from Stage 1').click();
  await page.waitForTimeout(500);

  // Run Phase 1
  await page.getByRole('button', { name: /Run Phase 1 Validator/ }).click();
  await page.waitForTimeout(1000);

  // Select Group 2 in modal
  const group2 = page.locator('input[type="radio"][value="group2"]');
  await group2.click();

  // Run Engine
  await page.getByRole('button', { name: 'Run Engine' }).click();
  await page.waitForTimeout(1000);

  // Run Smart Fix for Pass 1
  await page.getByRole('button', { name: 'Smart Fix 🔧' }).click();
  await page.waitForTimeout(1000);

  // Select 3D Topology
  await page.getByText('3D Topology').first().click();
  await page.waitForTimeout(1500); // Give the canvas time to render

  await page.screenshot({ path: '/home/jules/verification/canvas_updated.png', fullPage: true });

  // Now, go back to Data Table and verify it matches the formatting we want.
  await page.getByText('Data Table').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/jules/verification/table_updated.png', fullPage: true });

});
