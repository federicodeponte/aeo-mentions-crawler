const fetch = require('node-fetch');

async function testBackendAPI() {
  console.log('🚀 Testing backend API integration...');
  
  try {
    // Test the blog generation API endpoint
    console.log('📡 Testing blog generation API...');
    
    const response = await fetch('http://localhost:3000/api/blogs/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: 'AI customer service automation',
        instructions: 'Focus on small business benefits and ROI',
        language: 'en',
        word_count: 1000
      })
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ API responded successfully');
      console.log(`Response data keys: ${Object.keys(data)}`);
      
      if (data.success) {
        console.log('✅ Blog generation started successfully');
        console.log(`Process ID: ${data.processId || 'Not provided'}`);
        console.log(`Status: ${data.status || 'Not provided'}`);
      } else {
        console.log('⚠️ API responded but process not started');
        console.log(`Error: ${data.error || 'Unknown error'}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ API error (${response.status}): ${errorText}`);
    }
    
    // Test health/status endpoint if it exists
    console.log('\n🔍 Testing health endpoint...');
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      console.log(`Health endpoint status: ${healthResponse.status}`);
      
      if (healthResponse.status === 200) {
        const healthData = await healthResponse.json();
        console.log('✅ Health endpoint working');
        console.log(`Health data:`, healthData);
      }
    } catch (e) {
      console.log('ℹ️ No health endpoint found (normal)');
    }
    
    // Test any blog-related endpoints
    console.log('\n📚 Testing blog list endpoint...');
    try {
      const listResponse = await fetch('http://localhost:3000/api/blogs');
      console.log(`Blog list status: ${listResponse.status}`);
      
      if (listResponse.status === 200) {
        const listData = await listResponse.json();
        console.log('✅ Blog list endpoint working');
        console.log(`Blog count: ${Array.isArray(listData) ? listData.length : 'Unknown format'}`);
      }
    } catch (e) {
      console.log('ℹ️ Blog list endpoint may not exist');
    }
    
    console.log('\n🎉 Backend API test completed');
    
  } catch (error) {
    console.error('❌ Backend API test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the development server is running (npm run dev)');
    }
  }
}

// Test direct python service if available
async function testPythonService() {
  console.log('\n🐍 Testing Python blog-writer service...');
  
  try {
    // The Modal/Python service might be available locally
    const response = await fetch('http://localhost:8000/health', {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`Python service status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Python blog-writer service is running locally');
      
      // Test blog generation
      const generateResponse = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: 'AI automation test',
          language: 'en',
          word_count: 500
        })
      });
      
      if (generateResponse.status === 200) {
        console.log('✅ Python service blog generation endpoint working');
      }
    }
    
  } catch (error) {
    console.log('ℹ️ Python service not running locally (expected in most cases)');
  }
}

// Run tests
console.log('🧪 Starting backend integration tests...\n');
testBackendAPI().then(() => testPythonService());