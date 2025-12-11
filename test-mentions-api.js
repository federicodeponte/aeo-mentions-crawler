// Test AEO mentions check API functionality
console.log('🧪 Testing AEO Mentions Check API...\n');

async function testMentionsCheck() {
  const testData = {
    company_name: "SCAILE",
    company_analysis: {
      companyInfo: {
        name: "SCAILE",
        website: "https://scaile.tech",
        description: "AI-powered business solutions",
        industry: "Technology",
        productCategory: "AI Services",
        products: ["AI automation", "Business analytics"],
        services: ["AI consulting", "Process optimization"],
        pain_points: ["Manual processes", "Data inefficiency"]
      }
    },
    company_website: "https://scaile.tech",
    language: "en",
    country: "US", 
    num_queries: 3, // Small number for quick test
    mode: "fast"
  };

  const startTime = Date.now();
  
  try {
    console.log('📤 Sending mentions check request...');
    console.log(`Company: ${testData.company_name}`);
    console.log(`Mode: ${testData.mode} (${testData.num_queries} queries)`);
    console.log(`Website: ${testData.company_website}\n`);

    const response = await fetch('http://localhost:3005/api/aeo/mentions-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const responseTime = Date.now() - startTime;
    console.log(`📥 Response received in ${responseTime}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('\n✅ Mentions check completed successfully!');
    
    // Display results summary
    if (result.visibility !== undefined) {
      console.log(`📊 Visibility Score: ${result.visibility}%`);
    }
    
    if (result.queries && result.queries.length > 0) {
      console.log(`🔍 Generated Queries (${result.queries.length}):`);
      result.queries.slice(0, 3).forEach((query, i) => {
        console.log(`  ${i + 1}. "${query}"`);
      });
      if (result.queries.length > 3) {
        console.log(`  ... and ${result.queries.length - 3} more`);
      }
    }
    
    if (result.platforms && Object.keys(result.platforms).length > 0) {
      console.log('\n🤖 Platform Results:');
      Object.entries(result.platforms).forEach(([platform, data]) => {
        const mentions = data.mentions || 0;
        const total = data.total_queries || 0;
        const percentage = total > 0 ? Math.round((mentions / total) * 100) : 0;
        console.log(`  ${platform}: ${mentions}/${total} queries (${percentage}%)`);
      });
    }
    
    // Check for quality issues
    if (result.queries) {
      const suspiciousQueries = result.queries.filter(q => 
        q.length < 10 || q.includes('best A') || q.includes('best I') || 
        q.match(/^(best|top|good)\s+[A-Z]$/i)
      );
      
      if (suspiciousQueries.length > 0) {
        console.log('\n⚠️  Suspicious/Low-Quality Queries Detected:');
        suspiciousQueries.forEach((query, i) => {
          console.log(`  ${i + 1}. "${query}" (too short/nonsensical)`);
        });
      } else {
        console.log('\n✅ All queries appear to be high quality');
      }
    }

    console.log(`\n⏱️  Total Duration: ${Math.round(responseTime / 1000)}s`);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Request failed after ${responseTime}ms`);
    console.log(`Error: ${error.message}`);
    
    if (error.name === 'AbortError') {
      console.log('Request timed out - mentions check may be taking too long');
    } else if (error.message.includes('fetch')) {
      console.log('Network error - check if dev server is running on localhost:3005');
    }
  }
}

testMentionsCheck();