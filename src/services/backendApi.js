const request = async (path, options = {}) => {
  const response = await fetch(`/backend-api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
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
