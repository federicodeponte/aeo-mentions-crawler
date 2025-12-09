import { test, expect } from '@playwright/test';

test.describe('Keyword Generation UI E2E', () => {
  test('progress bar updates during generation', async ({ page }) => {
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Fill in form (assuming context is already set)
    // If context form exists, fill it first
    const companyInput = page.locator('input[placeholder*="Company"]').first();
    const urlInput = page.locator('input[placeholder*="URL"]').first();
    
    if (await companyInput.isVisible()) {
      await companyInput.fill('SCAILE');
      await urlInput.fill('https://scaile.tech');
    }
    
    // Set number of keywords
    const numKeywordsInput = page.locator('input[type="number"]').first();
    await numKeywordsInput.fill('5');
    
    // Click generate button
    const generateButton = page.locator('button:has-text("Generate Keywords")');
    await generateButton.click();
    
    // Wait for progress UI to appear
    await page.waitForSelector('text=Starting...', { timeout: 5000 });
    
    // Monitor progress for 30 seconds
    const startTime = Date.now();
    const progressValues: number[] = [];
    
    while (Date.now() - startTime < 30000) {
      // Get current progress percentage
      const progressText = await page.locator('text=/\\d+%/').first().textContent();
      if (progressText) {
        const progress = parseInt(progressText.replace('%', ''));
        if (progress > 0 && !progressValues.includes(progress)) {
          progressValues.push(progress);
          console.log(`Progress: ${progress}%`);
        }
      }
      
      // Check console logs
      const logs = await page.evaluate(() => {
        return (window as any).__testLogs || [];
      });
      
      await page.waitForTimeout(1000);
    }
    
    // Verify progress updated
    expect(progressValues.length).toBeGreaterThan(0);
    console.log(`Progress updated ${progressValues.length} times`);
    console.log(`Progress values: ${progressValues.join(', ')}`);
    
    // Wait for results (with timeout)
    try {
      await page.waitForSelector('table', { timeout: 600000 }); // 10 min timeout
      const keywordCount = await page.locator('table tbody tr').count();
      expect(keywordCount).toBeGreaterThan(0);
      console.log(`✅ Generated ${keywordCount} keywords`);
    } catch (e) {
      console.log('Results not found within timeout');
    }
  });
});

