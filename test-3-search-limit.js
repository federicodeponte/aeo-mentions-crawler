// Test performance with 3-search limit optimization
console.log('🚀 TESTING: 3-Search Limit Performance Optimization\n');

async function testSearchLimitPerformance() {
  // Use working format from earlier successful tests
  const mentionsData = {
    company_name: "SCAILE",
    company_analysis: {
      companyInfo: {
        name: "SCAILE",
        website: "scaile.tech",
        industry: "Answer Engine Optimization (AEO)",
        description: "AI-powered Answer Engine Optimization platform that helps businesses appear in Google AI Overviews and ChatGPT results for 'Best X for Y' searches"
      },
      products: [
        "AI Visibility Engine",
        "AEO Analytics Dashboard", 
        "Answer Engine Optimization Tools"
      ],
      services: [
        "AEO Strategy Consulting",
        "AI Visibility Optimization",
        "Answer Engine Content Creation"
      ],
      competitors: [
        { name: "Profound" },
        { name: "BrightEdge" },
        { name: "Conductor" }
      ]
    },
    mode: "fast",
    num_queries: 3  // Small test for speed validation
  };

  console.log('📊 Performance Test Configuration:');
  console.log('   🔧 Change: Added "max 3 searches" limit in prompt');
  console.log('   📈 Expected: 3x speed improvement (30-40s instead of 110s)');
  console.log('   🎯 Queries: 3 queries for SCAILE AEO platform');
  console.log('   ⚡ Goal: <40 seconds total (vs previous 110s)\n');

  const startTime = Date.now();
  console.log('⏱️  Starting optimized mentions check...');

  try {
    const response = await fetch('http://localhost:3002/api/aeo/mentions-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mentionsData)
    });

    const result = await response.json();
    const duration = (Date.now() - startTime) / 1000;
    const previousDuration = 110; // Previous test result

    console.log(`\n🎯 OPTIMIZATION RESULTS:`);
    console.log(`⏰ New Duration: ${duration.toFixed(1)} seconds`);
    console.log(`🐌 Previous Duration: ${previousDuration} seconds`);
    console.log(`📈 Speed Improvement: ${(previousDuration / duration).toFixed(1)}x faster`);
    console.log(`💾 Time Saved: ${(previousDuration - duration).toFixed(1)} seconds`);
    console.log(`📊 Queries Processed: ${result.actualQueriesProcessed || 'unknown'}`);
    console.log(`✅ Success Rate: ${result.success ? '100%' : '0%'}`);

    if (result.success) {
      const perQueryTime = duration / (result.actualQueriesProcessed || 1);
      console.log(`⚡ Performance: ${perQueryTime.toFixed(1)}s per query`);
      
      // Performance assessment
      if (duration < 40) {
        console.log('🎉 EXCELLENT: Under 40 seconds - optimization successful!');
      } else if (duration < 70) {
        console.log('✅ GOOD: Better performance, still room for improvement');
      } else {
        console.log('⚠️  LIMITED: Some improvement but needs more optimization');
      }

      // Search efficiency check
      const searchesPerQuery = duration < 40 ? '~3' : '>3';
      console.log(`🔍 Estimated searches per query: ${searchesPerQuery}`);

    } else {
      console.log('❌ Test failed:', result.error || 'Unknown error');
      if (result.details) {
        console.log('🔍 Error details:', result.details.substring(0, 200) + '...');
      }
    }

  } catch (error) {
    console.log('❌ Network/API error:', error.message);
  }
}

testSearchLimitPerformance();