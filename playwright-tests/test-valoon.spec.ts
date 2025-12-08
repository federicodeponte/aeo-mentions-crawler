import { test, expect } from '@playwright/test';

test.use({ storageState: undefined }); // Skip auth

test('test valoon.chat mentions with real company analysis', async ({ page }) => {
  // Navigate to AEO Analytics page (override config baseURL)
  await page.goto('http://localhost:3002/aeo-analytics');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Fill in company name
  await page.fill('input[id="mentions-company"]', 'valoon.chat');
  
  // Wait a moment for any auto-population
  await page.waitForTimeout(2000);
  
  // Click the mentions check button
  await page.click('button:has-text("Check Mentions")');
  
  // Wait for the check to complete (up to 2 minutes)
  await page.waitForSelector('text=Query Results', { timeout: 120000 });
  
  // Take a screenshot of the results
  await page.screenshot({ path: 'valoon-mentions-results.png', fullPage: true });
  
  // Get the generated queries from the results
  const queries = await page.$$eval('[data-testid="query-result"] .query-text, .accordion-trigger', (elements) => 
    elements.map(el => el.textContent?.trim()).filter(text => text && text.length > 10)
  );
  
  console.log('Generated queries for valoon.chat:');
  queries.forEach((query, index) => {
    console.log(`${index + 1}. ${query}`);
  });
  
  // Expect at least some queries to be generated
  expect(queries.length).toBeGreaterThan(0);
});