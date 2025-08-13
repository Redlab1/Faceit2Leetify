// Example usage patterns for the HTTP service

import { createHttpService, HttpService, jsonApi } from './services/http.js';
import { createFaceitApi, createLeetifyApi } from './services/api.js';

// 1. Basic HTTP service usage
export async function exampleBasicUsage() {
  const http = createHttpService({
    baseUrl: 'https://api.example.com',
    defaultHeaders: {
      'X-API-Key': 'your-api-key',
    },
    timeout: 5000,
  });

  try {
    // GET request
    const users = await http.get<{ users: any[] }>('/users');
    console.log('Users:', users.data.users);

    // POST request
    const newUser = await http.post('/users', {
      name: 'John Doe',
      email: 'john@example.com',
    });
    console.log('Created user:', newUser.data);

    // File upload
    const formData = new FormData();
    formData.append('file', new File(['content'], 'test.txt'));
    formData.append('description', 'Test file');

    const upload = await http.upload('/files', formData);
    console.log('Upload result:', upload.data);

  } catch (error) {
    console.error('API Error:', error);
  }
}

// 2. Using the pre-configured JSON API client
export async function exampleJsonApi() {
  try {
    const response = await jsonApi.get('https://httpbin.org/json');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 3. Faceit API usage
export async function exampleFaceitUsage() {
  const faceitApi = createFaceitApi('your-faceit-api-key');

  try {
    // Get player matches
    const matches = await faceitApi.getPlayerMatches('player-id', 10);
    console.log(`Found ${matches.length} matches`);

    // Get match details
    if (matches.length > 0) {
      const matchDetails = await faceitApi.getMatchDetails(matches[0].match_id);
      console.log('Match details:', matchDetails);

      // Get match statistics
      const stats = await faceitApi.getMatchStats(matches[0].match_id);
      console.log('Match stats:', stats);

      // Download demo
      const demoBlob = await faceitApi.downloadDemo(matches[0].match_id);
      console.log('Demo downloaded:', demoBlob.size, 'bytes');
    }
  } catch (error) {
    console.error('Faceit API Error:', error);
  }
}

// 4. Leetify API usage
export async function exampleLeetifyUsage() {
  const leetifyApi = createLeetifyApi('your-leetify-api-key');

  try {
    // Create demo file from blob
    const demoBlob = new Blob(['demo data'], { type: 'application/gzip' });
    const demoFile = new File([demoBlob], 'match.dem.gz');

    // Upload demo
    const uploadResult = await leetifyApi.uploadDemo(demoFile, {
      demo_url: '',
      match_date: new Date().toISOString(),
      map: 'de_dust2',
    });

    console.log('Upload started:', uploadResult.upload_id);

    // Check upload status
    const status = await leetifyApi.getUploadStatus(uploadResult.upload_id);
    console.log('Upload status:', status);
  } catch (error) {
    console.error('Leetify API Error:', error);
  }
}

// 5. Background script messaging pattern
export async function sendMessageToBackground(type: string, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type, data },
      {},
      (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      }
    );
  });
}

// Usage in popup/content script:
// const matches = await sendMessageToBackground('FETCH_FACEIT_MATCHES', { playerId: 'abc123' });
