import { HttpService, createHttpService } from './http.js';

// Faceit API types
export interface FaceitMatch {
  match_id: string;
  started_at: number;
  finished_at: number;
}

export interface FaceitMatchDetails {
  demo_url: string[];
}

export interface FaceitPlayerStats {
  player_id: string;
  nickname: string;
  game_player_stats: {
    [key: string]: string;
  };
}

// Leetify API types  
export interface LeetifyUpload {
  demo_url: string;
  match_date: string;
  map: string;
  // Add other required fields based on Leetify API
}

export class FaceitApiService {
  private http: HttpService;

  constructor(apiKey?: string) {
    this.http = createHttpService({
      baseUrl: 'https://open.faceit.com/data/v4',
      defaultHeaders: {
        'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        'Accept': 'application/json',
      },
    });
  }

  async getPlayerMatches(playerId: string, limit = 1): Promise<FaceitMatch[]> {
    try {
      const response = await this.http.get<{ items: FaceitMatch[] }>(
        `/players/${playerId}/history?limit=${limit}`
      );
      return response.data.items;
    } catch (error) {
      // Re-throw with enhanced error message for better debugging
      if (error instanceof Error) {
        console.error('Failed to fetch Faceit matches:', error.message);
        throw new Error(`Faceit API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async getMatchDetails(matchId: string): Promise<FaceitMatchDetails> {
    try {
      const response = await this.http.get<FaceitMatchDetails>(`/matches/${matchId}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to fetch match details:', error.message);
        throw new Error(`Faceit API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async getMatchStats(matchId: string): Promise<FaceitPlayerStats[]> {
    try {
      const response = await this.http.get<{ rounds: [{ teams: [{ players: FaceitPlayerStats[] }] }] }>(
        `/matches/${matchId}/stats`
      );
      // Flatten players from both teams
      return response.data.rounds[0]?.teams.flatMap(team => team.players) || [];
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to fetch match stats:', error.message);
        throw new Error(`Faceit API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async downloadDemo(matchId: string): Promise<Blob> {
    try {
      const response = await fetch(`https://demos.faceit.com/${matchId}.dem.gz`);
      if (!response.ok) {
        throw new Error(`Failed to download demo: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Failed to download demo:', error);
      throw error;
    }
  }
}

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

  // Legacy methods - keeping for backward compatibility but not used
  async uploadDemo(demoFile: File, metadata: LeetifyUpload): Promise<{ upload_id: string }> {
    try {
      const formData = new FormData();
      formData.append('demo', demoFile);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await this.http.upload<{ upload_id: string }>(
        '/uploads/demo',  // Update with actual endpoint
        formData
      );
      return response.data;
    } catch (error) {
      console.error('Failed to upload to Leetify:', error);
      throw error;
    }
  }

  async getUploadStatus(uploadId: string): Promise<{ status: string; progress?: number }> {
    try {
      const response = await this.http.get<{ status: string; progress?: number }>(
        `/uploads/${uploadId}/status`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get upload status:', error);
      throw error;
    }
  }
}

// Factory functions
export const createFaceitApi = (apiKey?: string) => new FaceitApiService(apiKey);
export const createLeetifyApi = () => new LeetifyApiService();
