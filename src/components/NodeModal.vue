<template>
  <div 
    class="modal-overlay" 
    @click.self="isEditing ? null : $emit('close')"
  >
    <div class="node-container glass-card">
      <h2 class="modal-title">{{ isEditing || mode === 'add' ? 'Configure Node' : 'Node Intelligence' }}</h2>

      <div v-if="isEditing || mode === 'add'" class="form-layout">
        <div class="input-group">
          <label>NAME</label>
          <input v-model="form.name" placeholder="Server Identity" />
        </div>

        <div class="input-group">
          <label>IP ADDRESS</label>
          <input 
            v-model="form.ip" 
            placeholder="0.0.0.0" 
            :class="{ 'error-border': errors.ip }"
          />
          <span v-if="errors.ip" class="error-tip">Invalid IP Format</span>
        </div>

        <div class="input-group">
          <label>PASSWORD</label>
          <input v-model="form.password" type="password" placeholder="••••••" />
        </div>

        <div class="input-group">
          <label>PORTS</label>
          <input 
            v-model="form.ports" 
            placeholder="e.g. 80, 443" 
            :class="{ 'error-border': errors.ports }"
          />
          <span v-if="errors.ports" class="error-tip">Use commas (e.g. 80,443)</span>
        </div>

        <div class="input-group full-width">
          <label>REMARK</label>
          <textarea v-model="form.remark" rows="2"></textarea>
        </div>
      </div>

      <div v-else class="detail-layout">
        <div class="detail-header">
          <div class="info">
            <h3 class="name">{{ form.name }}</h3>
            <span class="ip">{{ form.ip }}</span>
          </div>
          <div class="status-badge">
            <div class="status-dot online"></div>
            <span>ACTIVE</span>
          </div>
        </div>

        <div class="ports-grid">
          <div v-for="port in portList" :key="port" class="port-tag">
            <div class="breath-dot"></div>
            <span class="port-num">{{ port }}</span>
          </div>
        </div>

        <div class="remark-box">
          <label>REMARK</label>
          <p>{{ form.remark || 'No remarks provided for this node.' }}</p>
        </div>
      </div>

      <div class="button-group">
        <template v-if="mode === 'add'">
          <button class="btn btn-cancel" @click="$emit('close')">Cancel</button>
          <button class="btn btn-confirm" @click="validateAndSubmit">Add Node</button>
        </template>
        
        <template v-else>
          <button v-if="!isEditing" class="btn btn-delete" @click="handleDelete">Delete</button>
          <button v-if="!isEditing" class="btn btn-confirm" @click="isEditing = true">Modify</button>
          
          <button v-if="isEditing" class="btn btn-cancel" @click="cancelEdit">Cancel</button>
          <button v-if="isEditing" class="btn btn-confirm" @click="validateAndSubmit">Confirm</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const props = defineProps({
  mode: String,
  initialData: Object
});

const emit = defineEmits(['close', 'submit', 'delete']);

const isEditing = ref(false);
const errors = reactive({ ip: false, ports: false });

const form = reactive({
  name: props.initialData?.name || '',
  ip: props.initialData?.ip || '',
  password: props.initialData?.password || '',
  ports: props.initialData?.ports || '',
  remark: props.initialData?.remark || ''
});

// 解析端口列表
const portList = computed(() => {
  return form.ports ? form.ports.split(',').map(p => p.trim()) : [];
});

// 2. 格式检查逻辑
const validateAndSubmit = () => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const portRegex = /^(\d+)(,\s*\d+)*$/;

  errors.ip = !ipRegex.test(form.ip);
  errors.ports = !portRegex.test(form.ports);

  if (!errors.ip && !errors.ports) {
    emit('submit', { ...form });
    isEditing.value = false;
  }
};

const cancelEdit = () => {
  Object.assign(form, props.initialData); // 恢复原始数据
  isEditing.value = false;
  errors.ip = false;
  errors.ports = false;
};

const handleDelete = () => {
  if (confirm('Permanently remove this node?')) emit('delete');
};
</script>

<style scoped>
/* 1. 进入页面后背景模糊 60% (对应 ~30px 强虚化) */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(30px); 
  display: flex; justify-content: center; align-items: center;
  z-index: 3000;
}

/* 3. 继承 ServerCard 玻璃感样式 */
.glass-card {
  width: 420px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 35px;
  color: white;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
}

.modal-title { font-weight: 300; letter-spacing: 2px; text-align: center; margin-bottom: 30px; }

/* 表单与校验样式 */
.form-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.full-width { grid-column: span 2; }
.input-group label { display: block; font-size: 0.65rem; color: #888; margin-bottom: 6px; }
.input-group input, .input-group textarea {
  width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 12px; color: white; outline: none; box-sizing: border-box;
}
.error-border { border-color: #ff4757 !important; }
.error-tip { color: #ff4757; font-size: 0.6rem; display: block; margin-top: 4px; }

/* 详情页 UI 继承自 ServerCard */
.detail-layout { animation: fadeIn 0.4s ease; }
.detail-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
.detail-header .name { font-size: 1.5rem; margin: 0; font-weight: 600; }
.detail-header .ip { color: #888; font-size: 0.9rem; }

/* 端口呼吸灯 */
.ports-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px; }
.port-tag {
  background: rgba(255,255,255,0.05);
  padding: 6px 14px; border-radius: 20px;
  display: flex; align-items: center; gap: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}
.breath-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #2ed573;
  box-shadow: 0 0 10px #2ed573;
  animation: breathing 2s infinite ease-in-out;
}

.remark-box label { font-size: 0.7rem; color: #555; }
.remark-box p { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; font-size: 0.85rem; color: #ccc; }

.button-group { display: flex; gap: 15px; margin-top: 35px; }
.btn { flex: 1; padding: 14px; border-radius: 14px; border: none; cursor: pointer; transition: 0.3s; font-weight: 600; }
.btn-cancel { background: rgba(255,255,255,0.1); color: white; }
.btn-confirm { background: white; color: black; }
.btn-delete { color: #ff4757; background: none; border: 1px solid rgba(255,71,87,0.3); }

/* 动画定义 */
@keyframes breathing {
  0% { transform: scale(1); opacity: 0.6; box-shadow: 0 0 5px #2ed573; }
  50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 15px #2ed573; }
  100% { transform: scale(1); opacity: 0.6; box-shadow: 0 0 5px #2ed573; }
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>