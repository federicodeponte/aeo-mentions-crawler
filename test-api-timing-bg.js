// Direct API timing test - no UI needed
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testKeywordAPITiming() {
  console.log('🧪 [API TEST] Starting direct keyword generation timing test...');
  
  const testData = {
    company_name: 'SCAILE',
    company_url: 'https://scaile.tech',
    language: 'en',
    country: 'US',
    num_keywords: 50,
    description: 'AI-powered Answer Engine Optimization platform',
    target_audience: 'AI startups and tech companies',
    industry: 'AI/Technology'
  };
  
  const startTime = Date.now();
  console.log('⏱️ [API TEST] Started at:', new Date().toLocaleTimeString());
  
  try {
    const response = await fetch('http://localhost:3002/api/generate-keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ [API TEST] Failed after ${totalTime}s: ${response.status} - ${error}`);
      return;
    }
    
    const result = await response.json();
    
    console.log(`✅ [API TEST] COMPLETED in ${totalTime} seconds (${Math.floor(totalTime/60)}m ${totalTime%60}s)`);
    console.log(`📊 [API TEST] Generated ${result.keywords?.length || 0} keywords`);
    console.log(`⏰ [API TEST] Server reported: ${result.metadata?.generation_time?.toFixed(1)}s`);
    
    // Timing analysis
    if (totalTime < 60) {
      console.log('🚀 [API TEST] Fast generation - UI timing should be ~60s');
    } else if (totalTime < 120) {
      console.log('⚡ [API TEST] Medium speed - UI timing should be ~120s');
    } else if (totalTime < 180) {
      console.log('🕐 [API TEST] Slower generation - UI timing should be ~180s');
    } else {
      console.log('🐌 [API TEST] Long generation - UI timing should be ~240s+');
    }
    
  } catch (error) {
    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);
    console.log(`💥 [API TEST] Network error after ${totalTime}s:`, error.message);
  }
}

// Run the test
testKeywordAPITiming();