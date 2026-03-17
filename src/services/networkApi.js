export const validateNodeConnection = async ({ target, ports }) => {
  const response = await fetch('/api/network/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, ports })
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new Error(errorBody?.message || `Validation request failed (${response.status})`);
  }

  return response.json();
};

export const connectViaSsh = async ({ target, password }) => {
  const response = await fetch('/api/network/ssh-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, password })
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    throw new Error(errorBody?.message || `SSH request failed (${response.status})`);
  }

  return response.json();
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};
