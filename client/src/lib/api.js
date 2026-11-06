// Experiment 4a + 12: a small class that wraps fetch() for every call to the Express API.

// A custom error type, so pages can read err.status and err.details (per-field messages).
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const SERVER_UNREACHABLE = 'Cannot reach the EventHive server. Check that it is running.';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
    this.onUnauthorized = null; // set by AuthContext: log out when a token stops working
  }

  setToken(token) {
    this.token = token;
  }

  async request(method, path, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let response;
    try {
      response = await fetch(this.baseUrl + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      // fetch only rejects when the request never got an answer (server down, no network).
      throw new ApiError(0, SERVER_UNREACHABLE);
    }

    if (response.status === 204) return null;

    // Our Express API always answers in JSON. Anything else (an HTML page from a static host
    // such as Vercel with no API behind it, or a proxy error page) means the server isn't there.
    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    if (!isJson) throw new ApiError(0, SERVER_UNREACHABLE);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && this.token && this.onUnauthorized) this.onUnauthorized();
      throw new ApiError(response.status, data?.error || `Request failed (${response.status})`, data?.details);
    }
    return data;
  }

  get(path) {
    return this.request('GET', path);
  }

  post(path, body = {}) {
    return this.request('POST', path, body);
  }

  put(path, body) {
    return this.request('PUT', path, body);
  }

  patch(path, body) {
    return this.request('PATCH', path, body);
  }

  delete(path) {
    return this.request('DELETE', path);
  }
}

// One shared client for the whole app. VITE_API_URL lets a deployed frontend point at
// an API on another domain; locally the Vite proxy makes "/api" work.
export const api = new ApiClient(import.meta.env.VITE_API_URL || '/api');
