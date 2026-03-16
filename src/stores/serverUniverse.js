import { ref } from 'vue';

export const serverList = ref([
  {
    id: 1,
    name: 'Mac Mini M4',
    ip: '192.168.1.102',
    status: 'online',
    metrics: { cpu: 24, ram: 62, disk: 45 },
    uptime: '12d 4h',
    activePorts: 3,
    portStatuses: [
      { port: '22', status: 'up', message: 'reachable' },
      { port: '80', status: 'degraded', message: 'connection timeout' },
      { port: '5432', status: 'down', message: 'connect ECONNREFUSED' }
    ],
    ports: '22,80,5432',
    remark: 'Local Powerhouse'
  }
]);

export const addServer = (formData) => {
  serverList.value.push({
    ...formData,
    id: Date.now(),
    status: formData.status || 'online',
    metrics: { cpu: 0, ram: 0, disk: 0 },
    uptime: '0m',
    activePorts: formData.ports?.split(',').map((p) => p.trim()).filter(Boolean).length || 0,
    portStatuses: formData.portStatuses || []
  });
};

export const updateServer = (id, patch) => {
  const idx = serverList.value.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const cleanedPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  serverList.value[idx] = { ...serverList.value[idx], ...cleanedPatch };
  return serverList.value[idx];
};

export const removeServer = (id) => {
  serverList.value = serverList.value.filter((item) => item.id !== id);
};
