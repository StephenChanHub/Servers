<template>
 <div class="servers-page">
    <header class="page-header">
      <h1>Servers</h1>
    </header>

    <div class="cards-grid" v-if="isLoggedIn">
      <ServerCard v-for="s in serverList" :key="s.id" :server="s" />
      
      <div class="add-card">
        <span class="plus-icon">+</span>
        <span>Add Node</span>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <p>Please log in to manage your nodes.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ServerCard from '../components/ServerCard.vue';

// 接收来自 App.vue 的状态
defineProps({
  isLoggedIn: Boolean
});

const serverList = ref([
  {
    id: 1,
    name: 'Mac Mini M4',
    ip: '192.168.1.102',
    status: 'online',
    metrics: { cpu: 24, ram: 62, disk: 45 },
    uptime: '12d 4h 22m',
    activePorts: 8
  }
]);
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