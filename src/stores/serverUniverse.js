import { ref } from 'vue';
import { createNodeApi, deleteNodeApi, fetchNodesApi, reorderNodesApi, updateNodeApi } from '../services/backendApi';

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
  serverList.value.push(result.data);
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

export const reorderServers = async (fromId, toId) => {
  const fromIdx = serverList.value.findIndex((item) => item.id === fromId);
  const toIdx = serverList.value.findIndex((item) => item.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

  const moved = serverList.value.splice(fromIdx, 1)[0];
  serverList.value.splice(toIdx, 0, moved);

  await reorderNodesApi(serverList.value.map((item) => item.id));
};
