import { ref } from 'vue';
import { getStoredUser } from '../services/backendApi';
import { createNodeApi, deleteNodeApi, fetchNodesApi, updateNodeApi } from '../services/backendApi';

const NODE_ORDER_STORAGE_KEY = 'servers_universe_node_order';

export const serverList = ref([]);
export const nodesLoading = ref(false);

const getAccountOrderKey = () => {
  const user = getStoredUser();
  return user?.id ? String(user.id) : null;
};

const readOrderMap = () => {
  try {
    return JSON.parse(localStorage.getItem(NODE_ORDER_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveOrderMap = (map) => {
  localStorage.setItem(NODE_ORDER_STORAGE_KEY, JSON.stringify(map));
};

const persistCurrentOrder = () => {
  const accountKey = getAccountOrderKey();
  if (!accountKey) return;

  const map = readOrderMap();
  map[accountKey] = serverList.value.map((item) => item.id);
  saveOrderMap(map);
};

const applyStoredOrder = (nodes = []) => {
  const accountKey = getAccountOrderKey();
  if (!accountKey) return nodes;

  const orderedIds = readOrderMap()[accountKey] || [];
  if (!orderedIds.length) return nodes;

  const rank = new Map(orderedIds.map((id, idx) => [Number(id), idx]));
  return [...nodes].sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return b.id - a.id;
  });
};

export const loadServers = async () => {
  nodesLoading.value = true;
  try {
    const result = await fetchNodesApi();
    serverList.value = applyStoredOrder(result.data || []);
    persistCurrentOrder();
  } finally {
    nodesLoading.value = false;
  }
};

export const addServer = async (formData) => {
  const result = await createNodeApi(formData);
  serverList.value.unshift(result.data);
  persistCurrentOrder();
  return result.data;
};

export const updateServer = async (id, patch) => {
  const result = await updateNodeApi(id, patch);
  const idx = serverList.value.findIndex((item) => item.id === id);
  if (idx !== -1) serverList.value[idx] = result.data;
  persistCurrentOrder();
  return result.data;
};

export const removeServer = async (id) => {
  await deleteNodeApi(id);
  serverList.value = serverList.value.filter((item) => item.id !== id);
  persistCurrentOrder();
};

export const reorderServers = (fromId, toId) => {
  const fromIdx = serverList.value.findIndex((item) => item.id === fromId);
  const toIdx = serverList.value.findIndex((item) => item.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

  const moved = serverList.value.splice(fromIdx, 1)[0];
  serverList.value.splice(toIdx, 0, moved);
  persistCurrentOrder();
};
