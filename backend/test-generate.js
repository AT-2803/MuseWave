import fetch from 'node-fetch';

async function testGenerate() {
  try {
    const response = await fetch('http://localhost:3002/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-key-12345'
      },
      body: JSON.stringify({
        prompt: 'test music generation',
        duration: 30,
        includeVideo: false
      })
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testGenerate();