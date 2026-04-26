/**
 * LASUSTECH LMS — API Service Layer
 */

const API_BASE = 'http://localhost:8000/api';

class ApiService {
  static token = localStorage.getItem('lms_token');

  static setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('lms_token', token);
    } else {
      localStorage.removeItem('lms_token');
    }
  }

  static getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE}/${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  static get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  static post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Auth API
export const authApi = {
  login: (email, password) => ApiService.post('auth/login', { email, password }),
  register: (data) => ApiService.post('auth/register', data),
  me: () => ApiService.get('auth/me'),
};

// Books API
export const booksApi = {
  list: (params = {}) => ApiService.get('books', params),
  search: (params = {}) => ApiService.get('books/search', params),
  get: (id) => ApiService.get(`books/${id}`),
  create: (data) => ApiService.post('books', data),
  update: (id, data) => ApiService.put(`books/${id}`, data),
  delete: (id) => ApiService.delete(`books/${id}`),
};

// Transactions API
export const transactionsApi = {
  list: (params = {}) => ApiService.get('transactions', params),
  my: (params = {}) => ApiService.get('transactions/my', params),
  get: (id) => ApiService.get(`transactions/${id}`),
  checkout: (data) => ApiService.post('transactions/checkout', data),
  return: (data) => ApiService.post('transactions/return', data),
};

// Fines API
export const finesApi = {
  list: (params = {}) => ApiService.get('fines', params),
  my: () => ApiService.get('fines/my'),
  pay: (fineId) => ApiService.post('fines/pay', { fine_id: fineId }),
  waive: (fineId) => ApiService.post('fines/waive', { fine_id: fineId }),
};

// Users API
export const usersApi = {
  list: (params = {}) => ApiService.get('users', params),
  get: (id) => ApiService.get(`users/${id}`),
  create: (data) => ApiService.post('users', data),
  update: (id, data) => ApiService.put(`users/${id}`, data),
  delete: (id) => ApiService.delete(`users/${id}`),
};

// Reports API
export const reportsApi = {
  dashboard: () => ApiService.get('reports/dashboard'),
  analytics: () => ApiService.get('reports/analytics'),
  activity: (params = {}) => ApiService.get('reports/activity', params),
};

// Categories API
export const categoriesApi = {
  list: () => ApiService.get('categories'),
  get: (id) => ApiService.get(`categories/${id}`),
  create: (data) => ApiService.post('categories', data),
};

export default ApiService;
