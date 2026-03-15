<template>
  <div class="servers-page">
    <header class="page-header">
      <h1>Servers</h1>
    </header>

    <div class="cards-grid" v-if="isLoggedIn">
      <ServerCard 
        v-for="s in serverList" 
        :key="s.id" 
        :server="s" 
        @click="openNodeModal('edit', s)"
      />
      
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
      @close="nodeModal.show = false"
      @submit="handleNodeSubmit"
      @delete="handleNodeDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import ServerCard from '../components/ServerCard.vue';
import NodeModal from '../components/NodeModal.vue';

defineProps({ isLoggedIn: Boolean });

// 模拟数据源
const serverList = ref([
  { id: 1, name: 'Mac Mini M4', ip: '192.168.1.102', status: 'online', metrics: { cpu: 24, ram: 62, disk: 45 }, uptime: '12d 4h 22m', activePorts: 8, password: '', ports: '80, 443', remark: 'Main workstation' }
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
    // 模拟添加
    const newNode = {
      ...formData,
      id: Date.now(),
      status: 'online',
      metrics: { cpu: 0, ram: 0, disk: 0 },
      uptime: '0m',
      activePorts: formData.ports.split(',').length
    };
    serverList.value.push(newNode);
  } else {
    // 模拟更新
    const index = serverList.value.findIndex(s => s.id === nodeModal.data.id);
    if (index !== -1) serverList.value[index] = { ...serverList.value[index], ...formData };
  }
  nodeModal.show = false;
};

const handleNodeDelete = () => {
  serverList.value = serverList.value.filter(s => s.id !== nodeModal.data.id);
  nodeModal.show = false;
};
</script>

<style scoped>

.empty-state {
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #444;
  font-size: 1.2rem;
  border: 1px dashed rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

.servers-page {
  padding: 60px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header { margin-bottom: 40px; }
.page-header h1 { font-size: 5rem; margin-bottom: 8px; font-weight: 300;color: white; }


.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
}

/* “添加”卡片的样式 */
.add-card {
  height: 340px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #444;
  cursor: pointer;
  transition: 0.3s;
}
.add-card:hover {
  background: rgba(255, 255, 255, 0.02);
  color: #888;
  border-color: rgba(255, 255, 255, 0.2);
}
.plus-icon { font-size: 2rem; margin-bottom: 10px; }
</style>