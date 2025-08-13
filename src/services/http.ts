export interface HttpConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpError extends Error {
  public responseBody?: any;

  constructor(
    public status: number,
    public response: Response,
    responseBody?: any,
    message?: string
  ) {
    const errorMessage = message || HttpError.extractErrorMessage(status, response, responseBody);
    super(errorMessage);
    this.name = 'HttpError';
    this.responseBody = responseBody;
  }

  private static extractErrorMessage(status: number, response: Response, responseBody?: any): string {
    // Try to extract meaningful error message from response body
    if (responseBody) {
      if (typeof responseBody === 'string') {
        return `HTTP ${status}: ${responseBody}`;
      }
      
      if (typeof responseBody === 'object') {
        // Common API error message patterns
        const errorMessage = 
          responseBody.error?.message ||
          responseBody.error ||
          responseBody.message ||
          responseBody.detail ||
          responseBody.details ||
          JSON.stringify(responseBody);
        
        return `HTTP ${status}: ${errorMessage}`;
      }
    }
    
    // Fallback to status text if no body or can't extract message
    return `HTTP ${status}: ${response.statusText || 'Unknown error'}`;
  }
}

export class HttpService {
  private config: HttpConfig;

  constructor(config: HttpConfig = {}) {
    this.config = {
      timeout: 10000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  private async request<T>(
    method: string,
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = this.config.baseUrl ? `${this.config.baseUrl}${url}` : url;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          ...this.config.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to read the error response body
        let errorBody: any;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            errorBody = await response.json();
          } else {
            errorBody = await response.text();
          }
        } catch (parseError) {
          // If we can't parse the error body, just use the response as-is
          console.warn('Failed to parse error response body:', parseError);
        }
        
        throw new HttpError(response.status, response, errorBody);
      }

      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof HttpError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }

  async get<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, options);
  }

  async post<T>(
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const createHttpService = (config?: HttpConfig) => new HttpService(config);