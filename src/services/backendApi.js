const REQUEST_TIMEOUT_MS = 10000;
const AUTH_USER_STORAGE_KEY = 'servers_universe_user';
const AUTH_TOKEN_STORAGE_KEY = 'servers_universe_token';

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';

export const setStoredSession = ({ user, token }) => {
  if (user?.id) localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearStoredUser = () => {
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

const request = async (path, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const token = getStoredToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(options.headers || {})
  };

  try {
    const response = await fetch(`/backend-api${path}`, {
      ...options,
      headers: mergedHeaders,
      signal: controller.signal
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || `Request failed (${response.status})`);
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout: backend login/api not responding.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const loginApi = ({ username, password }) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

export const signUpApi = ({ username, password }) =>
  request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

export const logoutApi = () =>
  request('/auth/logout', {
    method: 'POST'
  });

export const fetchNodesApi = () => request('/nodes');

export const reorderNodesApi = (ids) =>
  request('/nodes/reorder', {
    method: 'POST',
    body: JSON.stringify({ ids })
  });

export const createNodeApi = (node) =>
  request('/nodes', {
    method: 'POST',
    body: JSON.stringify(node)
  });

export const updateNodeApi = (id, patch) =>
  request(`/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch)
  });

export const deleteNodeApi = (id) =>
  request(`/nodes/${id}`, {
    method: 'DELETE'
  });
