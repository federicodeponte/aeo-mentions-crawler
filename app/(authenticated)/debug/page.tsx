'use client'

export default function DebugPage() {
  const handleBasicClick = () => {
    alert('✅ Basic click works!')
    console.log('✅ Basic click works!')
  }

  const handleFetchTest = async () => {
    try {
      console.log('🔍 Testing fetch...')
      const response = await fetch('/api/aeo/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          company_name: 'Debug Test'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert('✅ Fetch works! Score: ' + (data.score || data.overall_score))
        console.log('✅ Fetch works:', data)
      } else {
        alert('❌ Fetch failed: ' + response.status)
        console.log('❌ Fetch failed:', response.status)
      }
    } catch (error) {
      alert('❌ Fetch error: ' + error.message)
      console.log('❌ Fetch error:', error)
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Browser Debug Test</h1>
      <p>Testing basic browser functionality</p>
      
      <div style={{ marginTop: '30px' }}>
        <h2>Test 1: Basic Click</h2>
        <button 
          onClick={handleBasicClick}
          style={{
            padding: '16px 24px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🟢 Test Basic Click
        </button>
        <span>← This should show an alert</span>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Test 2: API Fetch</h2>
        <button 
          onClick={handleFetchTest}
          style={{
            padding: '16px 24px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔵 Test API Fetch
        </button>
        <span>← This should make an API call</span>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Browser Info</h2>
        <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px', fontSize: '14px' }}>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          <p><strong>JavaScript:</strong> ✅ Enabled (you can see this page)</p>
          <p><strong>Cookies:</strong> {navigator.cookieEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
          <p><strong>Local Storage:</strong> {typeof Storage !== 'undefined' ? '✅ Available' : '❌ Not Available'}</p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Instructions</h2>
        <ol>
          <li>Click the <strong>green button</strong> - you should see an alert</li>
          <li>Click the <strong>blue button</strong> - you should see another alert with API data</li>
          <li>Open browser console (F12) to see any error messages</li>
          <li>Report back which buttons work/don't work</li>
        </ol>
      </div>
    </div>
  )
}