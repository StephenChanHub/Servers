<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    
    <div class="node-container glass-card">
      
      <div v-if="view !== 'ssh' && view !== 'confirm_delete'" class="top-right-action">
        <button class="ssh-btn-trigger" @click="enterSSHView">
          <span class="icon">⚡</span> SSH
        </button>
      </div>

      <div v-if="view === 'ssh'" class="view-content fade-in">
        <h2 class="modal-title">Secure Connection</h2>
        <div class="ssh-form">
          <p class="hint">Target: <strong>{{ form.ip }}</strong></p>
          <div class="input-group">
            <label>SSH PASSWORD</label>
            <input v-model="sshPassword" type="password" placeholder="••••••" @keyup.enter="handleSSHConnect" />
          </div>
          <div class="button-group">
            <button class="btn btn-cancel" @click="exitSSHView">Back</button>
            <button class="btn btn-confirm" @click="handleSSHConnect">Connect</button>
          </div>
        </div>
      </div>

      <div v-else-if="view === 'confirm_delete'" class="view-content fade-in center">
        <div class="warning-icon">⚠️</div>
        <h2 class="modal-title">Delete Node?</h2>
        <p class="warning-text">This action cannot be undone. All data for <strong>{{ form.name }}</strong> will be erased.</p>
        <div class="button-group">
          <button class="btn btn-cancel" @click="view = 'detail'">Cancel</button>
          <button class="btn btn-danger" @click="$emit('delete')">Confirm Delete</button>
        </div>
      </div>

      <div v-else-if="mode === 'add' || isEditing" class="view-content fade-in">
        <h2 class="modal-title">{{ mode === 'add' ? 'Add New Node' : 'Edit Node Config' }}</h2>
        <div class="form-layout">
          <div class="input-group">
            <label>NAME</label>
            <input v-model="form.name" placeholder="Server Name" />
          </div>
          <div class="input-group">
            <label>IP ADDRESS</label>
            <input v-model="form.ip" placeholder="0.0.0.0" :class="{ 'error-border': errors.ip }" />
            <span v-if="errors.ip" class="error-tip">IP is required and must be valid</span>
          </div>
          <div class="input-group full-width">
            <label>PORTS (comma separated)</label>
            <input v-model="form.ports" placeholder="80, 443" />
            <ul class="port-preview">
              <li v-for="p in portList" :key="p"># {{ p }}</li>
            </ul>
          </div>
          <div class="input-group full-width">
            <label>REMARK</label>
            <textarea v-model="form.remark" rows="2"></textarea>
          </div>
        </div>
        <div class="button-group">
          <button class="btn btn-cancel" @click="handleCancelAction">Cancel</button>
          <button class="btn btn-confirm" @click="validateAndSubmit">
            {{ mode === 'add' ? 'Add Node' : 'Confirm Changes' }}
          </button>
        </div>
      </div>

      <div v-else class="view-content fade-in">
        <div class="detail-header">
          <h3 class="name">{{ form.name }}</h3>
          <span class="ip">{{ form.ip }}</span>
        </div>
        
        <div class="metrics-container">
          <div class="metric-item" v-for="m in ['cpu', 'ram', 'disk']" :key="m">
            <div class="metric-label">
              <span>{{ m.toUpperCase() }}</span>
              <span v-if="isConnected">{{ initialData.metrics[m] }}%</span>
            </div>
            <div class="progress-bar">
              <div v-if="!isConnected" class="no-ssh-text">SSH Required for Metrics</div>
              <div v-else class="progress-fill" :style="{ width: initialData.metrics[m] + '%', backgroundColor: getMetricColor(initialData.metrics[m]) }"></div>
            </div>
          </div>
        </div>

        <div class="port-section">
          <label>MONITORED PORTS</label>
          <ul class="port-status-list">
            <li v-for="port in portList" :key="port">
              <span class="breath-dot" :class="{ 'active': isConnected }"></span>
              {{ port }}
            </li>
          </ul>
        </div>

        <div class="button-group">
          <button class="btn btn-cancel" @click="view = 'confirm_delete'">Delete</button>
          <button class="btn btn-confirm" @click="isEditing = true">Modify</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const props = defineProps({
  mode: String,
  initialData: Object,
  isConnected: Boolean
});

const emit = defineEmits(['close', 'submit', 'delete', 'ssh-connect']);

const view = ref(props.mode === 'add' ? 'form' : 'detail');
const isEditing = ref(false);
const sshPassword = ref('');
const errors = reactive({ ip: false });

const form = reactive({
  name: props.initialData?.name || '',
  ip: props.initialData?.ip || '',
  ports: props.initialData?.ports || '',
  remark: props.initialData?.remark || ''
});

const portList = computed(() => {
  return form.ports ? form.ports.split(',').map(p => p.trim()).filter(p => p) : [];
});

// 3. 未填写 IP 直接进入 SSH 报错逻辑
const enterSSHView = () => {
  if (!form.ip || form.ip.trim() === '') {
    errors.ip = true;
    alert("Error: Please provide a valid IP address before initiating SSH.");
    return;
  }
  errors.ip = false;
  view.value = 'ssh';
};

const exitSSHView = () => {
  view.value = props.mode === 'add' ? 'form' : (isEditing.value ? 'form' : 'detail');
};

const handleCancelAction = () => {
  if (props.mode === 'add') emit('close');
  else isEditing.value = false;
};

const handleOverlayClick = () => {
  // modify 状态下不允许点击空白处返回
  if (!isEditing.value && view.value !== 'ssh' && view.value !== 'confirm_delete') {
    emit('close');
  }
};

const validateAndSubmit = () => {
  if (!form.ip) { errors.ip = true; return; }
  emit('submit', { ...form });
  isEditing.value = false;
};

const getMetricColor = (v) => v > 80 ? '#ff4757' : v > 50 ? '#ffa502' : '#2ed573';
</script>

<style scoped>
/* 1. 全面虚化背景 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(60px); 
  display: flex; justify-content: center; align-items: center;
  z-index: 3000;
}

.glass-card {
  width: 440px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  padding: 40px;
  color: white;
  position: relative;
  box-shadow: 0 30px 60px rgba(0,0,0,0.6);
}

/* 布局动画 */
.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* 表单与详情样式继承 */
.form-layout { display: flex; flex-direction: column; gap: 20px; }
.input-group label { display: block; font-size: 0.7rem; color: #666; margin-bottom: 8px; }
.input-group input, .input-group textarea {
  width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 12px; color: white; outline: none; box-sizing: border-box;
}
.error-border { border-color: #ff4757 !important; }

/* 4. 删除确认样式 */
.center { text-align: center; }
.warning-icon { font-size: 3rem; margin-bottom: 20px; }
.warning-text { color: #888; margin-bottom: 30px; font-size: 0.9rem; line-height: 1.5; }
.btn-danger { background: #ff4757; color: white; }

/* 继承 ServerCard 视觉逻辑 */
.metrics-container { margin: 30px 0; }
.metric-item { margin-bottom: 18px; }
.metric-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; margin-bottom: 8px; }
.progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; position: relative; overflow: hidden; }
.no-ssh-text { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #444; letter-spacing: 1px; }
.progress-fill { height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }

/* 端口呼吸灯 */
.port-status-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
.port-status-list li { background: rgba(255,255,255,0.05); padding: 8px 15px; border-radius: 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.1); }
.breath-dot { width: 6px; height: 6px; border-radius: 50%; background: #333; }
.breath-dot.active { background: #2ed573; box-shadow: 0 0 8px #2ed573; animation: blink 2s infinite; }

@keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

/* 按钮组 */
.button-group { display: flex; gap: 15px; margin-top: 40px; }
.btn { flex: 1; padding: 14px; border-radius: 14px; border: none; cursor: pointer; font-weight: 600; transition: 0.3s; }
.btn-confirm { background: white; color: black; }
.btn-cancel { background: rgba(255,255,255,0.08); color: white; }
.ssh-btn-trigger { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 6px 15px; cursor: pointer; font-size: 0.75rem; }
</style>