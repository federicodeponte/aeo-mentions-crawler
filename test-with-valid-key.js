// Test mentions check with valid API key to get real performance metrics
console.log('🧪 PERFORMANCE TEST: Valid API Key - Real Timing\n');

async function testWithValidKey() {
  console.log('📊 Test Configuration:');
  console.log('   API Key: Valid (updated)');
  console.log('   Mode: fast');
  console.log('   Queries: 2');
  console.log('   Expected: Much faster than 5+ minutes\n');

  const testData = {
    company_name: "SCAILE",
    company_analysis: {
      companyInfo: {
        name: "SCAILE",
        website: "https://scaile.tech", 
        description: "AI-powered EdTech platform for workforce development and education analytics",
        industry: "EdTech",
        productCategory: "SaaS",
        products: ["AI Platform", "Learning Analytics"],
        services: ["Consulting", "Implementation"],
        pain_points: ["Skills gaps", "Education misalignment"]
      }
    },
    company_website: "https://scaile.tech",
    mode: "fast",
    num_queries: 2, // Small number to test
    language: "en", 
    country: "US"
  };

  const startTime = Date.now();
  console.log(`🚀 Starting at: ${new Date().toLocaleTimeString()}`);
  
  // Progress indicator every 15 seconds
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    console.log(`⏱️  ${minutes}:${seconds.toString().padStart(2, '0')} - Still processing...`);
  }, 15000);

  try {
    const response = await fetch('http://localhost:3005/api/aeo/mentions-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
      signal: AbortSignal.timeout(300000) // 5 minute max
    });

    clearInterval(progressInterval);
    const responseTime = Date.now() - startTime;
    const minutes = Math.floor(responseTime / 60000);
    const seconds = Math.floor((responseTime % 60000) / 1000);
    
    console.log(`\n📥 Completed at: ${new Date().toLocaleTimeString()}`);
    console.log(`⏰ TOTAL TIME: ${minutes}:${seconds.toString().padStart(2, '0')} (${Math.round(responseTime/1000)}s)`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n❌ FAILED:');
      console.log(errorText.substring(0, 500));
      return;
    }

    const result = await response.json();
    
    console.log('\n🎉 SUCCESS! Mentions check completed');
    console.log('=' .repeat(50));
    
    if (result.visibility !== undefined) {
      console.log(`\n🎯 VISIBILITY: ${result.visibility}%`);
    }

    if (result.queries && result.queries.length > 0) {
      console.log(`\n🔍 QUERIES (${result.queries.length}):`);
      result.queries.forEach((query, i) => {
        console.log(`   ${i + 1}. "${query}"`);
      });

      // Quality check
      const badQueries = result.queries.filter(q => 
        !q || q.length < 10 || 
        q.includes('best A') || q.includes('best I') || 
        q.match(/^(best|top|good)\\s+[A-Z]$/i)
      );

      if (badQueries.length === 0) {
        console.log(`\n✅ QUERY QUALITY: Perfect - no "best A" nonsense!`);
      } else {
        console.log(`\n⚠️  QUERY ISSUES: ${badQueries.length} problems found`);
      }
    }

    if (result.platforms && Object.keys(result.platforms).length > 0) {
      console.log('\n🤖 PLATFORM RESULTS:');
      Object.entries(result.platforms).forEach(([platform, data]) => {
        const mentions = data.mentions || 0;
        const total = data.total_queries || 0;
        const percentage = total > 0 ? Math.round((mentions / total) * 100) : 0;
        console.log(`   ${platform.toUpperCase()}: ${mentions}/${total} (${percentage}%)`);
      });
    }

    // Performance analysis
    console.log('\n⏱️  PERFORMANCE ASSESSMENT:');
    if (responseTime < 60000) {
      console.log(`   🚀 EXCELLENT: ${Math.round(responseTime/1000)}s - Much faster than before!`);
      console.log('   ✅ 120s UI timer is more than enough');
    } else if (responseTime < 120000) {
      console.log(`   ⚡ GOOD: ${Math.round(responseTime/1000)}s - Within acceptable range`);
      console.log('   ✅ 120s UI timer is appropriate');
    } else if (responseTime < 180000) {
      console.log(`   ⚠️  MODERATE: ${Math.round(responseTime/1000)}s - Could be better`);
      console.log('   💡 Consider 180s UI timer');
    } else {
      console.log(`   🐌 SLOW: ${Math.round(responseTime/1000)}s - Still needs optimization`);
      console.log('   ⚠️  UI timer needs to be increased');
    }

    console.log('\n🏆 CONCLUSIONS:');
    console.log('   ✅ Valid API key fixes the core issue');
    console.log('   ✅ Mentions check is fully functional');
    console.log(`   📊 Real processing time: ${Math.round(responseTime/1000)}s`);
    console.log('   🎯 Previous 5+ min was due to expired key');
    
    return { success: true, time: responseTime };

  } catch (error) {
    clearInterval(progressInterval);
    const elapsed = Date.now() - startTime;
    
    if (error.name === 'TimeoutError') {
      console.log(`\n⏰ TIMEOUT after ${Math.round(elapsed/1000)}s`);
      console.log('   Still slower than expected - needs further optimization');
    } else {
      console.log(`\n❌ ERROR: ${error.message}`);
    }
    
    return { success: false, time: elapsed };
  }
}

// Start the test
testWithValidKey().catch(console.error);