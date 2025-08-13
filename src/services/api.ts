import { HttpService, createHttpService } from './http.js';

export class LeetifyApiService {
  private http: HttpService;

  constructor() {
    this.http = createHttpService({
      baseUrl: 'https://api.cs-prod.leetify.com/api/faceit-demos',
      defaultHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
  }

  async submitDemoUrl(demoUrl: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.http.post<{ success: boolean; message?: string }>(
        '/submit-demo-download-url',
        { url: demoUrl }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to submit demo URL to Leetify:', error);
      throw error;
    }
  }
}

export const createLeetifyApi = () => new LeetifyApiService();