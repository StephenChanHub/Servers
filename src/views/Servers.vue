<template>
  <div class="servers-page">
    <header class="page-header">
      <h1>Servers</h1>
    </header>

    <div class="cards-grid" v-if="isLoggedIn">
      <ServerCard v-for="s in serverList" :key="s.id" :server="s" @click="openNodeModal('edit', s)" />

      <div class="add-card" @click="openNodeModal('add')">
        <span class="plus-icon">+</span>
        <span>Add Node</span>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Please log in to manage your nodes.</p>
    </div>

    <NodeModal
      v-if="nodeModal.show"
      :mode="nodeModal.mode"
      :initialData="nodeModal.data"
      :isConnected="nodeModal.data.status === 'online'"
      :existingIps="serverList.map((s) => s.ip)"
      @close="nodeModal.show = false"
      @submit="handleNodeSubmit"
      @delete="handleNodeDelete"
      @ssh-success="handleSshSuccess"
      @refresh-status="handleRefreshStatus"
    />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import NodeModal from '../components/NodeModal.vue';
import ServerCard from '../components/ServerCard.vue';

defineProps({ isLoggedIn: Boolean });

const serverList = ref([
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

const nodeModal = reactive({
  show: false,
  mode: 'add',
  data: {}
});

const openNodeModal = (mode, data = {}) => {
  nodeModal.mode = mode;
  nodeModal.data = data;
  nodeModal.show = true;
};

const handleNodeSubmit = (formData) => {
  if (nodeModal.mode === 'add') {
    serverList.value.push({
      ...formData,
      id: Date.now(),
      status: formData.status || 'online',
      metrics: { cpu: 0, ram: 0, disk: 0 },
      uptime: '0m',
      activePorts: formData.ports?.split(',').map((p) => p.trim()).filter(Boolean).length || 0,
      portStatuses: formData.portStatuses || []
    });
  } else {
    const idx = serverList.value.findIndex((s) => s.id === nodeModal.data.id);
    if (idx !== -1) {
      serverList.value[idx] = {
        ...serverList.value[idx],
        ...formData,
        portStatuses: formData.portStatuses || serverList.value[idx].portStatuses
      };
      nodeModal.data = serverList.value[idx];
    }
  }
  nodeModal.show = false;
};

const handleNodeDelete = () => {
  serverList.value = serverList.value.filter((s) => s.id !== nodeModal.data.id);
  nodeModal.show = false;
};

const handleSshSuccess = ({ id, metrics, uptime }) => {
  if (!id || !metrics) return;

  const idx = serverList.value.findIndex((s) => s.id === id);
  if (idx === -1) return;

  serverList.value[idx] = {
    ...serverList.value[idx],
    status: 'online',
    metrics: {
      cpu: metrics.cpu,
      ram: metrics.ram,
      disk: metrics.disk
    },
    uptime: uptime || serverList.value[idx].uptime
  };
  nodeModal.data = serverList.value[idx];
};

const handleRefreshStatus = ({ id, status, portStatuses }) => {
  if (!id) return;
  const idx = serverList.value.findIndex((s) => s.id === id);
  if (idx === -1) return;

  serverList.value[idx] = {
    ...serverList.value[idx],
    status: status || serverList.value[idx].status,
    portStatuses: portStatuses || serverList.value[idx].portStatuses
  };
  nodeModal.data = serverList.value[idx];
};
</script>

<style scoped>
.servers-page { padding: 60px 40px; width: 100%; box-sizing: border-box; }
.page-header h1 { font-size: 5rem; font-weight: 300; color: white; margin-bottom: 40px; }
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 50px; }
.add-card { height: 340px; border: 2px dashed rgba(255, 255, 255, 0.1); border-radius: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #444; cursor: pointer; transition: 0.3s; }
.add-card:hover { border-color: rgba(255, 255, 255, 0.3); color: #888; }
.empty-state { color: #333; text-align: center; margin-top: 100px; }
</style>
