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
import { reactive } from 'vue';
import NodeModal from '../components/NodeModal.vue';
import ServerCard from '../components/ServerCard.vue';
import { addServer, removeServer, serverList, updateServer } from '../stores/serverUniverse';

defineProps({ isLoggedIn: Boolean });

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
    addServer(formData);
  } else {
    const updated = updateServer(nodeModal.data.id, {
      ...formData,
      portStatuses: formData.portStatuses || nodeModal.data.portStatuses
    });
    if (updated) nodeModal.data = updated;
  }
  nodeModal.show = false;
};

const handleNodeDelete = () => {
  removeServer(nodeModal.data.id);
  nodeModal.show = false;
};

const handleSshSuccess = ({ id, metrics, uptime }) => {
  if (!id || !metrics) return;
  const updated = updateServer(id, {
    status: 'online',
    metrics: {
      cpu: metrics.cpu,
      ram: metrics.ram,
      disk: metrics.disk
    },
    uptime
  });
  if (updated) nodeModal.data = updated;
};

const handleRefreshStatus = ({ id, status, portStatuses }) => {
  if (!id) return;
  const updated = updateServer(id, {
    status: status || undefined,
    portStatuses: portStatuses || undefined
  });
  if (updated) nodeModal.data = updated;
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
