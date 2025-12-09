import { test, expect } from '@playwright/test';

test.describe('Keyword Generation UI - Full E2E', () => {
  test('progress bar updates and results display', async ({ page }) => {
    // Navigate to keywords page
    console.log('🌐 Navigating to keywords page...');
    await page.goto('http://localhost:3002/keywords');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Set up console log monitoring FIRST
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[PROGRESS]')) {
        consoleLogs.push(text);
        console.log(`📊 ${text}`);
      }
    });
    
    // Check if we need to fill context form
    const contextForm = page.locator('form').filter({ hasText: /company|url/i }).first();
    const hasContextForm = await contextForm.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasContextForm) {
      console.log('📝 Filling company context form...');
      // Try multiple selectors for company input
      const companyInput = page.locator('input[name*="company" i]')
        .or(page.locator('input[placeholder*="Company" i]'))
        .or(page.locator('input').filter({ hasText: /company/i }))
        .first();
      const urlInput = page.locator('input[name*="url" i]')
        .or(page.locator('input[placeholder*="URL" i]'))
        .or(page.locator('input[type="url"]'))
        .first();
      
      await companyInput.waitFor({ state: 'visible', timeout: 5000 });
      await companyInput.fill('SCAILE');
      await urlInput.fill('https://scaile.tech');
      
      // Submit context form if there's a submit button
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /analyze|submit|save/i }).first();
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        // Wait for context to be saved
        await page.waitForTimeout(2000);
      }
    }
    
    // Set number of keywords to 5 for faster test
    const numKeywordsInput = page.locator('input[type="number"]').first();
    await numKeywordsInput.waitFor({ state: 'visible', timeout: 5000 });
    await numKeywordsInput.fill('5');
    console.log('✅ Set keywords to 5');
    
    // Enable trends and autocomplete if checkboxes exist
    const trendsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /trends/i }).first();
    const autocompleteCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /autocomplete/i }).first();
    
    if (await trendsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await trendsCheckbox.isChecked())) {
        await trendsCheckbox.check();
      }
    }
    if (await autocompleteCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await autocompleteCheckbox.isChecked())) {
        await autocompleteCheckbox.check();
      }
    }
    
    // Wait for generate button to be enabled
    console.log('⏳ Waiting for Generate button to be enabled...');
    const generateButton = page.locator('button:has-text("Generate Keywords")').first();
    await generateButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for button to be enabled (not disabled)
    await page.waitForFunction(
      (button) => !button.disabled,
      await generateButton.elementHandle(),
      { timeout: 10000 }
    ).catch(async () => {
      // If still disabled, check why
      const isDisabled = await generateButton.isDisabled();
      console.log(`⚠️  Button disabled: ${isDisabled}`);
      // Try clicking anyway
    });
    
    console.log('🚀 Clicking Generate Keywords...');
    await generateButton.click();
    
    // Wait for progress UI to appear
    console.log('⏳ Waiting for progress UI...');
    await page.waitForSelector('text=/\\d+%/', { timeout: 10000 });
    
    // Monitor progress for up to 2 minutes
    const startTime = Date.now();
    const progressValues: number[] = [];
    let lastProgress = 0;
    
    console.log('📊 Monitoring progress updates...');
    
    while (Date.now() - startTime < 120000) { // 2 min max
      // Get current progress percentage
      const progressElement = page.locator('text=/\\d+%/').first();
      if (await progressElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        const progressText = await progressElement.textContent();
        if (progressText) {
          const progress = parseInt(progressText.replace('%', '').trim());
          if (progress > lastProgress) {
            progressValues.push(progress);
            lastProgress = progress;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`⏱️  [${elapsed}s] Progress: ${progress}%`);
          }
        }
      }
      
      // Check if results appeared (API completed)
      const resultsTable = page.locator('table').first();
      if (await resultsTable.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('✅ Results appeared!');
        break;
      }
      
      await page.waitForTimeout(1000);
    }
    
    // Verify progress updated
    console.log(`\n📈 Progress Summary:`);
    console.log(`   - Progress updated ${progressValues.length} times`);
    console.log(`   - Progress values: ${progressValues.join('%, ')}%`);
    console.log(`   - Console logs captured: ${consoleLogs.length}`);
    
    expect(progressValues.length).toBeGreaterThan(0);
    
    // Wait for results with longer timeout
    console.log('⏳ Waiting for results...');
    await page.waitForSelector('table', { timeout: 600000 }); // 10 min
    
    // Verify results
    const keywordRows = page.locator('table tbody tr');
    const keywordCount = await keywordRows.count();
    console.log(`✅ Generated ${keywordCount} keywords`);
    
    expect(keywordCount).toBeGreaterThan(0);
    
    // Check for enhanced data (expandable rows)
    const detailsButtons = page.locator('button:has-text("Details")').or(page.locator('button:has-text("Show")'));
    const detailsCount = await detailsButtons.count();
    console.log(`📊 Enhanced data available for ${detailsCount} keywords`);
    
    console.log('\n✅ E2E TEST COMPLETE');
    console.log(`   - Progress bar: ${progressValues.length > 0 ? '✅ Updated' : '❌ Not updated'}`);
    console.log(`   - Results: ${keywordCount > 0 ? '✅ Displayed' : '❌ Not displayed'}`);
    console.log(`   - Console logs: ${consoleLogs.length > 0 ? '✅ Captured' : '❌ Not captured'}`);
  });
});

