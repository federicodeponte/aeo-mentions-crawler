// Debug: Check what structure company analysis actually returns
console.log('🔍 DEBUGGING: Company Analysis Output Structure\n');

async function debugCompanyAnalysis() {
  try {
    const response = await fetch('http://localhost:3005/api/aeo/company-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: "SCAILE",
        company_website: "https://scaile.tech"
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Company analysis result:');
    console.log(JSON.stringify(result, null, 2));

    // Check specific fields that mentions check looks for
    console.log('\n🔍 Field Analysis:');
    console.log(`- Has companyInfo: ${!!result.companyInfo}`);
    console.log(`- Has company_info: ${!!result.company_info}`);
    console.log(`- Has analysis: ${!!result.analysis}`);
    
    if (result.companyInfo) {
      console.log(`- Products: ${JSON.stringify(result.companyInfo.products || [])}`);
      console.log(`- Services: ${JSON.stringify(result.companyInfo.services || [])}`);
    }
    
    if (result.company_info) {
      console.log(`- Products (alt): ${JSON.stringify(result.company_info.products || [])}`);
      console.log(`- Services (alt): ${JSON.stringify(result.company_info.services || [])}`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

debugCompanyAnalysis();