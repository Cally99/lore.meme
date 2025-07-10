// src/lib/api/clients/baseClient.ts
import { authLogger } from '@/lib/monitoring/logger';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export class BaseApiClient {
  protected baseUrl: string;
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }
  
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      const data = await response.json().catch(() => null);
      
      if (!response.ok) {
        const errorMessage = data?.error || 'An error occurred';
        authLogger.warn(`API Error: ${errorMessage}`, { endpoint, status: response.status });
        
return {
          data: null,
          error: errorMessage,
          status: response.status,
        };
      }
      
      return {
        data,
        error: null,
        status: response.status,
      };
    } catch (error) {
      authLogger.error('API Request Failed', error as Error, { endpoint });
      
return {
        data: null,
        error: (error as Error).message || 'Network error',
        status: 0, // 0 indicates network error
      };
    }
  }
  
  protected async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }
  
  protected async post<T>(endpoint: string, data: unknown, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  protected async put<T>(endpoint: string, data: unknown, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  protected async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
  
  protected async upload<T>(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        ...options.headers,
      },
    });
  }
}