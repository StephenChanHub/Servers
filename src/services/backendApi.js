const REQUEST_TIMEOUT_MS = 10000;

const request = async (path, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`/backend-api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
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

export const fetchNodesApi = () => request('/nodes');

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
