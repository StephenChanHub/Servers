<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    
    <div class="node-container glass-card">
      
      <div v-if="view !== 'ssh' && view !== 'confirm_delete'" class="top-right-action">
        <button class="ssh-btn-trigger" @click="enterSSHView">
          <span class="icon"></span> SSH
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
        <p class="warning-text">Action for <strong>{{ form.name }}</strong> cannot be undone.</p>
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
            <span v-if="errors.ip" class="error-tip">{{ ipErrorMsg }}</span>
          </div>
          <div class="input-group full-width">
            <label>PORTS (comma separated)</label>
            <input v-model="form.ports" placeholder="80, 443" />
          </div>
          <div class="input-group full-width">
            <label>REMARK</label>
            <textarea v-model="form.remark" rows="2" placeholder="Write something..."></textarea>
          </div>
        </div>
        <div class="button-group">
          <button class="btn btn-cancel" @click="handleCancelAction">Cancel</button>
          <button class="btn btn-confirm" @click="validateAndSubmit">Confirm</button>
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
              <div v-if="isConnected" class="progress-fill" :style="{ width: initialData.metrics[m] + '%', backgroundColor: getMetricColor(initialData.metrics[m]) }"></div>
            </div>
            <div v-if="!isConnected" class="metric-sub-tip">* SSH required for real-time metrics</div>
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

        <div class="remark-display" v-if="form.remark">
          <label>REMARK</label>
          <p>{{ form.remark }}</p>
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
  isConnected: Boolean,
  existingIps: Array // 接收已有的 IP 列表用于查重
});

const emit = defineEmits(['close', 'submit', 'delete', 'ssh-connect']);

const view = ref(props.mode === 'add' ? 'form' : 'detail');
const isEditing = ref(false);
const sshPassword = ref('');
const errors = reactive({ ip: false });
const ipErrorMsg = ref('IP is required');

const form = reactive({
  name: props.initialData?.name || '',
  ip: props.initialData?.ip || '',
  ports: props.initialData?.ports || '',
  remark: props.initialData?.remark || ''
});

const portList = computed(() => {
  return form.ports ? form.ports.split(',').map(p => p.trim()).filter(p => p) : [];
});

// 3. 进入 SSH 前检查 IP
const enterSSHView = () => {
  if (!form.ip || form.ip.trim() === '') {
    errors.ip = true;
    ipErrorMsg.value = "Please enter IP first";
    return;
  }
  view.value = 'ssh';
};

const handleSSHConnect = () => {
  if (sshPassword.value) {
    emit('ssh-connect', { ip: form.ip, password: sshPassword.value });
    view.value = props.mode === 'add' ? 'form' : 'detail';
  }
};

const exitSSHView = () => {
  view.value = props.mode === 'add' ? 'form' : (isEditing.value ? 'form' : 'detail');
};

const handleCancelAction = () => {
  if (props.mode === 'add') emit('close');
  else isEditing.value = false;
};

const handleOverlayClick = () => {
  if (!isEditing.value && view.value !== 'ssh' && view.value !== 'confirm_delete') {
    emit('close');
  }
};

// 3. 提交前的重复 IP 检查
const validateAndSubmit = () => {
  const isDuplicate = props.existingIps.includes(form.ip) && form.ip !== props.initialData?.ip;
  
  if (!form.ip) {
    errors.ip = true;
    ipErrorMsg.value = "IP is required";
    return;
  }
  
  if (isDuplicate) {
    errors.ip = true;
    ipErrorMsg.value = "Duplicate IP detected";
    alert("Warning: This IP address is already configured in another node.");
    return;
  }

  errors.ip = false;
  emit('submit', { ...form });
  isEditing.value = false;
};

const getMetricColor = (v) => v > 80 ? '#ff4757' : v > 50 ? '#ffa502' : '#2ed573';
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0.9, 0.9, 0.9, 0.9); 
  -webkit-backdrop-filter: blur(90px); 
  backdrop-filter: blur(90%); /* 背景 60% 虚化感 */
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

/* 1. SSH 按钮右上角绝对定位 */
.top-right-action {
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 10;
}

.ssh-btn-trigger {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 15px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: 0.3s;
}

.ssh-btn-trigger:hover { background: rgba(255, 255, 255, 0.2); }

/* 2. Remark 显示样式 */
.remark-display {
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}
.remark-display label { font-size: 0.65rem; color: #555; display: block; margin-bottom: 5px; }
.remark-display p { font-size: 0.85rem; color: #ccc; margin: 0; line-height: 1.4; }

/* 详情页指标下标 */
.metric-sub-tip { font-size: 0.65rem; color: #555; margin-top: 4px; font-style: italic; }

.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.form-layout { display: flex; flex-direction: column; gap: 20px; }
.input-group label { display: block; font-size: 0.7rem; color: #666; margin-bottom: 8px; }
.input-group input, .input-group textarea {
  width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 12px; color: white; outline: none; box-sizing: border-box;
}
.error-border { border-color: #ff4757 !important; }
.error-tip { color: #ff4757; font-size: 0.65rem; margin-top: 5px; display: block; }

.metrics-container { margin: 30px 0; }
.metric-item { margin-bottom: 20px; }
.metric-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; margin-bottom: 8px; }
.progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; transition: width 0.8s ease; }

.port-status-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
.port-status-list li { background: rgba(255,255,255,0.05); padding: 8px 15px; border-radius: 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.1); }
.breath-dot { width: 6px; height: 6px; border-radius: 50%; background: #333; }
.breath-dot.active { background: #2ed573; box-shadow: 0 0 8px #2ed573; animation: blink 2s infinite; }
@keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.button-group { display: flex; gap: 15px; margin-top: 40px; }
.btn { flex: 1; padding: 14px; border-radius: 14px; border: none; cursor: pointer; font-weight: 600; transition: 0.3s; }
.btn-confirm { background: white; color: black; }
.btn-cancel { background: rgba(255,255,255,0.08); color: white; }
.btn-danger { background: #ff4757; color: white; }
.center { text-align: center; }
.warning-icon { font-size: 3rem; margin-bottom: 20px; }
</style>