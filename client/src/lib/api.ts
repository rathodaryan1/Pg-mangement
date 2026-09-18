/**
 * Central API Client for Urban Nest
 * Handles base URL, auth token injection, standard response parsing, and error handling.
 */

let rawBaseUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).trim();

if (rawBaseUrl.endsWith('/')) {
  rawBaseUrl = rawBaseUrl.slice(0, -1);
}

const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('urbannest_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('urbannest_auth_token', token);
    } else {
      localStorage.removeItem('urbannest_auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('urbannest_auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Attach Bearer token if present
    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized: clear invalid auth token
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem('urbannest_user_session');
      }

      const data = await response.json().catch(() => ({
        success: false,
        message: `HTTP error status: ${response.status}`,
      }));

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          query.append(key, String(val));
        }
      });
      const queryString = query.toString();
      if (queryString) url += `?${queryString}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient();
export default api;
