#!/usr/bin/env python3
import os
os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

try:
    from google import genai
    client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])
    response = client.models.generate_content(
        model='gemini-2.0-flash-exp',
        contents='Say hello in 5 words'
    )
    print('✅ API Key works!')
    print(f'Response: {response.text}')
except Exception as e:
    print(f'❌ API Key test failed: {e}')
    import traceback
    traceback.print_exc()

