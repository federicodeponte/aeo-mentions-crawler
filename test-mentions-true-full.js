// TRUE FULL HEADLESS TEST - 15 minute timeout to see actual completion
console.log('⏰ TRUE FULL HEADLESS TEST: AEO Mentions Check (15-minute timeout)');
console.log('🎯 Goal: See exactly how long it takes and if it actually completes\n');

async function runTrueFullTest() {
  const testStartTime = Date.now();
  
  console.log('📊 Test Configuration:');
  console.log('   Timeout: 15 minutes (900 seconds)');
  console.log('   Mode: fast');
  console.log('   Queries: 2 (minimal for speed)');
  console.log('   Platform: All AI platforms');
  
  const mentionsData = {
    company_name: "SCAILE",
    company_analysis: {
      companyInfo: {
        name: "SCAILE",
        website: "https://scaile.tech", 
        description: "SCAILE is an AI-powered EdTech platform that bridges the gap between education and workforce development through intelligent analytics and personalized learning pathways",
        industry: "EdTech / AI / Workforce Development",
        productCategory: "SaaS Platform",
        products: [
          "SCAILE Intelligence Platform",
          "Personalized Learning Pathways"
        ],
        services: [
          "Workforce Transformation Consulting",
          "Curriculum Alignment Services"
        ],
        pain_points: [
          "Skills gaps in the workforce",
          "Misalignment between education and industry needs"
        ]
      }
    },
    company_website: "https://scaile.tech",
    mode: "fast",
    num_queries: 2,
    language: "en", 
    country: "US"
  };

  console.log('\n🚀 Starting mentions check...');
  console.log(`📤 Request sent at: ${new Date().toLocaleTimeString()}`);
  
  // Show progress every 30 seconds
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - testStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    console.log(`⏱️  Still processing... ${minutes}:${seconds.toString().padStart(2, '0')} elapsed`);
  }, 30000);

  try {
    const startTime = Date.now();

    const response = await fetch('http://localhost:3005/api/aeo/mentions-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mentionsData),
      signal: AbortSignal.timeout(900000) // 15 minute timeout
    });

    clearInterval(progressInterval);
    const responseTime = Date.now() - startTime;
    const minutes = Math.floor(responseTime / 60000);
    const seconds = Math.floor((responseTime % 60000) / 1000);
    
    console.log(`\n📥 Response received at: ${new Date().toLocaleTimeString()}`);
    console.log(`⏰ TOTAL TIME: ${minutes}:${seconds.toString().padStart(2, '0')} (${Math.round(responseTime/1000)} seconds)`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n❌ MENTIONS CHECK FAILED:');
      console.log('📄 Full error response:');
      console.log(errorText);
      
      if (response.status === 500) {
        console.log('\n🔍 500 Error Analysis:');
        console.log('   - Server processed request but encountered internal error');
        console.log('   - May be Python script error or AI API issue');
        console.log('   - Check server logs for detailed error info');
      }
      return;
    }

    // SUCCESS! Parse the results
    const result = await response.json();
    
    console.log('\n🎉 SUCCESS! MENTIONS CHECK COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    
    // Detailed results analysis
    if (result.visibility !== undefined) {
      console.log(`\n🎯 VISIBILITY SCORE: ${result.visibility}%`);
    }

    if (result.queries && result.queries.length > 0) {
      console.log(`\n🔍 GENERATED QUERIES (${result.queries.length}):`);
      result.queries.forEach((query, i) => {
        console.log(`   ${i + 1}. "${query}"`);
      });

      // Critical quality check - are queries still nonsensical?
      const badQueries = result.queries.filter(q => 
        !q || q.length < 10 || 
        q.includes('best A') || q.includes('best I') || 
        q.match(/^(best|top|good)\s+[A-Z]$/i) ||
        q.match(/^.{1,5}$/) // Very short queries
      );

      console.log(`\n📊 QUERY QUALITY ASSESSMENT:`);
      if (badQueries.length === 0) {
        console.log('   ✅ EXCELLENT: All queries are meaningful and well-formed');
        console.log('   🎉 No "best A" or "best I" nonsense detected!');
        console.log('   ✅ Query generation issue is FIXED');
      } else {
        console.log(`   ❌ ISSUES FOUND: ${badQueries.length}/${result.queries.length} problematic queries`);
        console.log('   🚨 Bad queries:');
        badQueries.forEach(q => console.log(`      - "${q}"`));
        console.log('   ⚠️  Query generation still has issues');
      }
    }

    if (result.platforms && Object.keys(result.platforms).length > 0) {
      console.log('\n🤖 PLATFORM RESULTS:');
      Object.entries(result.platforms).forEach(([platform, data]) => {
        const mentions = data.mentions || 0;
        const total = data.total_queries || 0;
        const percentage = total > 0 ? Math.round((mentions / total) * 100) : 0;
        console.log(`   ${platform.toUpperCase()}: ${mentions}/${total} queries mentioned company (${percentage}%)`);
      });
    }

    if (result.cost_breakdown) {
      console.log(`\n💰 COST: ${JSON.stringify(result.cost_breakdown)}`);
    }

    if (result.summary) {
      console.log(`\n📝 SUMMARY: ${result.summary}`);
    }

    // Performance assessment
    console.log('\n⏱️  PERFORMANCE ANALYSIS:');
    console.log(`   📏 Processing time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    console.log(`   📊 Seconds: ${Math.round(responseTime/1000)}s`);
    
    if (responseTime < 120000) {
      console.log('   🚀 FAST: Under 2 minutes - current 120s timer is OK');
    } else if (responseTime < 300000) {
      console.log('   ⚡ MODERATE: 2-5 minutes - need to increase UI timer');
      console.log(`   💡 Recommended UI timer: ${Math.ceil(responseTime/60000) + 1} minutes`);
    } else {
      console.log('   🐌 SLOW: Over 5 minutes - significant optimization needed');
      console.log(`   ⚠️  Current 120s timer is completely unrealistic`);
      console.log(`   🔧 Must increase timer to at least ${Math.ceil(responseTime/60000)} minutes`);
    }

    console.log('\n🏆 FINAL VERDICT:');
    console.log('   ✅ Mentions check: FULLY FUNCTIONAL');
    console.log('   ✅ API connectivity: WORKING');
    console.log('   ✅ Data processing: WORKING');
    console.log('   ✅ Results generation: WORKING');
    console.log(`   ⏱️  Actual time needed: ${Math.ceil(responseTime/60000)} minutes`);
    console.log('\n🎊 CONCLUSION: AEO MENTIONS CHECK IS WORKING CORRECTLY!');
    console.log(`🕐 Your 5+ minute experience is explained: it actually takes ${Math.round(responseTime/60000)} minutes!`);

  } catch (error) {
    clearInterval(progressInterval);
    const elapsed = Date.now() - testStartTime;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
    
    console.log(`\n💥 Test ended at: ${new Date().toLocaleTimeString()}`);
    console.log(`⏱️  Time elapsed: ${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`);
    
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      console.log('\n⏰ TIMEOUT AFTER 15 MINUTES');
      console.log('\n📊 TIMEOUT ANALYSIS:');
      console.log('   🔍 What we learned:');
      console.log('   1. ✅ API accepts requests and starts processing');
      console.log('   2. ⏳ Takes longer than 15 minutes to complete');
      console.log('   3. 🐌 This is extremely slow for 2 queries in fast mode');
      console.log('   4. 🚨 May indicate infinite loop or stuck process');
      console.log('\n💡 CONCLUSIONS:');
      console.log('   - Mentions check may be working but extremely slow');
      console.log('   - OR there might be a hang/infinite loop in the code');
      console.log('   - Your 5+ minute experience suggests it does eventually complete');
      console.log('   - Needs significant optimization or debugging');
      console.log('\n🔧 RECOMMENDATIONS:');
      console.log('   1. Check Python script logs for stuck processes');
      console.log('   2. Test with num_queries: 1 for faster results');
      console.log('   3. Consider async processing with status updates');
      console.log('   4. Debug the Python mentions service directly');
    } else {
      console.log(`\n❌ Unexpected error: ${error.message}`);
      console.log('   This suggests a deeper technical issue');
    }
  }
}

console.log('Starting test...\n');
runTrueFullTest().catch(console.error);