import { ref } from 'vue';
import { createNodeApi, deleteNodeApi, fetchNodesApi, updateNodeApi } from '../services/backendApi';

export const serverList = ref([]);
export const nodesLoading = ref(false);

export const loadServers = async () => {
  nodesLoading.value = true;
  try {
    const result = await fetchNodesApi();
    serverList.value = result.data || [];
  } finally {
    nodesLoading.value = false;
  }
};

export const addServer = async (formData) => {
  const result = await createNodeApi(formData);
  serverList.value.unshift(result.data);
  return result.data;
};

export const updateServer = async (id, patch) => {
  const result = await updateNodeApi(id, patch);
  const idx = serverList.value.findIndex((item) => item.id === id);
  if (idx !== -1) serverList.value[idx] = result.data;
  return result.data;
};

export const removeServer = async (id) => {
  await deleteNodeApi(id);
  serverList.value = serverList.value.filter((item) => item.id !== id);
};
