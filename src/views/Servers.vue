<template>
  <div class="servers-page" :class="{ locked: nodeModal.show }">
    <header class="page-header">
      <h1>Servers</h1>
      <p class="sort-hint">Drag cards to reorder freely.</p>
    </header>

    <div class="cards-grid" v-if="isLoggedIn && !nodesLoading">
      <div
        v-for="s in serverList"
        :key="s.id"
        class="card-wrapper"
        :class="{ 'is-dragging': draggingId === s.id, 'is-drag-over': dragOverId === s.id }"
        draggable="true"
        @dragstart="onDragStart(s.id, $event)"
        @dragover.prevent="onDragOver(s.id)"
        @drop.prevent="onDrop(s.id)"
        @dragend="onDragEnd"
      >
        <ServerCard :server="s" @click="openNodeModal('edit', s)" />
      </div>

      <div class="add-card" @click="openNodeModal('add')">
        <span class="plus-icon">+</span>
        <span>Add Node</span>
      </div>
    </div>

    <div v-else-if="isLoggedIn && nodesLoading" class="empty-state">
      <p>Loading nodes...</p>
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
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import NodeModal from '../components/NodeModal.vue';
import ServerCard from '../components/ServerCard.vue';
import { addServer, loadServers, nodesLoading, removeServer, reorderServers, serverList, updateServer } from '../stores/serverUniverse';

const props = defineProps({ isLoggedIn: Boolean });

const nodeModal = reactive({
  show: false,
  mode: 'add',
  data: {}
});

const draggingId = ref(null);
const dragOverId = ref(null);

const onDragStart = (id, event) => {
  draggingId.value = id;
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(id));
  }
};

const onDragOver = (id) => {
  if (!draggingId.value || draggingId.value === id) return;
  dragOverId.value = id;
};

const onDrop = async (id) => {
  if (!draggingId.value || draggingId.value === id) return;
  try {
    await reorderServers(draggingId.value, id);
  } catch (error) {
    notifyError(error, 'Reorder failed');
    await loadServers();
  }
  dragOverId.value = null;
};

const onDragEnd = () => {
  draggingId.value = null;
  dragOverId.value = null;
};

const openNodeModal = (mode, data = {}) => {
  nodeModal.mode = mode;
  nodeModal.data = data;
  nodeModal.show = true;
};

const notifyError = (error, fallback) => {
  const message = error?.message || fallback;
  console.error(message);
  window.alert(message);
};

const handleNodeSubmit = async (formData) => {
  try {
    if (nodeModal.mode === 'add') {
      await addServer(formData);
    } else {
      const updated = await updateServer(nodeModal.data.id, {
        ...formData,
        portStatuses: formData.portStatuses || nodeModal.data.portStatuses
      });
      if (updated) nodeModal.data = updated;
    }
    nodeModal.show = false;
  } catch (error) {
    notifyError(error, 'Save node failed');
  }
};

const handleNodeDelete = async () => {
  try {
    await removeServer(nodeModal.data.id);
    nodeModal.show = false;
  } catch (error) {
    notifyError(error, 'Delete node failed');
  }
};

const handleSshSuccess = async ({ id, metrics, uptime }) => {
  if (!id || !metrics) return;
  try {
    const updated = await updateServer(id, {
      status: 'online',
      metrics: {
        cpu: metrics.cpu,
        ram: metrics.ram,
        disk: metrics.disk
      },
      uptime
    });
    if (updated) nodeModal.data = updated;
  } catch (error) {
    notifyError(error, 'Update metrics failed');
  }
};

const handleRefreshStatus = async ({ id, status, portStatuses }) => {
  if (!id) return;
  try {
    const updated = await updateServer(id, {
      status: status || undefined,
      portStatuses: portStatuses || undefined
    });
    if (updated) nodeModal.data = updated;
  } catch (error) {
    notifyError(error, 'Refresh status failed');
  }
};

watch(
  () => props.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) loadServers();
  },
  { immediate: true }
);

onMounted(() => {
  if (props.isLoggedIn) loadServers();
});

watch(
  () => nodeModal.show,
  (showing) => {
    const page = document.querySelector('.page-wrapper');
    if (!page) return;
    page.style.overflowY = showing ? 'hidden' : 'auto';
  }
);

onBeforeUnmount(() => {
  const page = document.querySelector('.page-wrapper');
  if (page) page.style.overflowY = 'auto';
});
</script>

<style scoped>
.servers-page {
  padding: 60px 40px 120px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  overflow: visible;
}
.page-header h1 { font-size: 5rem; font-weight: 300; color: white; margin-bottom: 8px; }
.sort-hint { color: #6f6f6f; margin: 0 0 30px; font-size: 0.85rem; }
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 50px; }
.card-wrapper { transition: transform 0.2s ease, opacity 0.2s ease; }
.card-wrapper.is-dragging { opacity: 0.35; transform: scale(0.98); }
.card-wrapper.is-drag-over { outline: 1px dashed rgba(255, 255, 255, 0.45); outline-offset: 8px; border-radius: 24px; }
.add-card { height: 340px; border: 2px dashed rgba(255, 255, 255, 0.1); border-radius: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #444; cursor: pointer; transition: 0.3s; }
.add-card:hover { border-color: rgba(255, 255, 255, 0.3); color: #888; }
.empty-state { color: #333; text-align: center; margin-top: 100px; }
.servers-page.locked { pointer-events: auto; }
</style>
