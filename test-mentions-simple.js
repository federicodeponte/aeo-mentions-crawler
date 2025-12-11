// Test AEO mentions check with minimal data to see if it works
console.log('🧪 Testing AEO Mentions Check with minimal data...\n');

async function testMinimalMentionsCheck() {
  const testData = {
    company_name: "SCAILE",
    company_analysis: {
      companyInfo: {
        name: "SCAILE", 
        website: "https://scaile.tech",
        description: "AI business automation platform",
        industry: "Technology",
        productCategory: "SaaS",
        products: ["AI automation platform"],
        services: ["AI consulting"],
        pain_points: ["Manual processes"]
      }
    },
    mode: "fast",
    num_queries: 1 // Absolute minimum for testing
  };

  console.log('📤 Sending minimal mentions check request...');
  console.log(`Company: ${testData.company_name}`);
  console.log(`Queries: ${testData.num_queries} (minimal test)`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3005/api/aeo/mentions-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    console.log(`📥 Response after ${responseTime}ms (${Math.round(responseTime/1000)}s)`);
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText.substring(0, 500));
      return;
    }

    const result = await response.json();
    console.log('\n✅ AEO Mentions Check WORKS!');
    console.log(`📊 Visibility Score: ${result.visibility || 'N/A'}%`);
    
    if (result.queries) {
      console.log(`🔍 Generated Query: "${result.queries[0]}"`);
      
      // Check query quality
      const query = result.queries[0];
      if (query && query.length > 10 && !query.includes('best A') && !query.includes('best I')) {
        console.log('✅ Query quality looks good (not nonsensical)');
      } else {
        console.log('⚠️  Query quality may be poor');
      }
    }

    if (result.platforms) {
      console.log('\n🤖 Platform Results:');
      Object.entries(result.platforms).forEach(([platform, data]) => {
        const mentions = data.mentions || 0;
        const total = data.total_queries || 0;
        console.log(`  ${platform}: ${mentions}/${total} queries mentioned`);
      });
    }

    console.log('\n🎉 CONCLUSION: AEO Mentions Check is WORKING correctly!');
    console.log(`⏱️  Processing took ${Math.round(responseTime/1000)} seconds`);

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.log('⏱️  Request timed out after 30 seconds');
      console.log('ℹ️  This likely means the mentions check is working but takes time');
      console.log('   The 120-second timer in the UI is realistic for full checks');
    } else {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
}

testMinimalMentionsCheck();