<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    <div class="node-container glass-card">
      <div v-if="view !== 'ssh' && view !== 'confirm_delete'" class="top-right-action">
        <button class="refresh-btn-trigger" :disabled="refreshing || !form.ip.trim()" @click="refreshNodeStatus">
          {{ refreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button class="ssh-btn-trigger" :disabled="!form.ip.trim()" @click="enterSSHView">
          <span class="icon"></span> SSH
        </button>
      </div>

      <div v-if="view === 'ssh'" class="view-content fade-in">
        <h2 class="modal-title">Secure Connection</h2>
        <div class="ssh-form">
          <p class="hint">Target: <strong>{{ sshResult.target || form.ip }}</strong></p>
          <div class="input-group">
            <label>SSH PASSWORD</label>
            <input v-model="sshPassword" type="password" placeholder="••••••" @keyup.enter="handleSSHConnect" />
          </div>
          <div v-if="sshResult.message" class="status-panel" :class="sshResult.success ? 'status-success' : 'status-fail'">
            <p>{{ sshResult.message }}</p>
            <ul v-if="sshResult.metrics" class="status-list">
              <li>CPU: {{ sshResult.metrics.cpu }}%</li>
              <li>RAM: {{ sshResult.metrics.ram }}%</li>
              <li>DISK: {{ sshResult.metrics.disk }}%</li>
              <li>UPTIME: {{ sshResult.metrics.uptime }}</li>
            </ul>
          </div>
          <div class="button-group">
            <button class="btn btn-cancel" @click="exitSSHView">Back</button>
            <button class="btn btn-confirm" :disabled="sshResult.loading" @click="handleSSHConnect">
              {{ sshResult.loading ? 'Connecting...' : 'Connect' }}
            </button>
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
            <input v-model="form.name" maxlength="10" placeholder="Server Name" />
          </div>
          <div class="input-group">
            <label>IP / DOMAIN</label>
            <input v-model="form.ip" placeholder="192.168.1.1 or example.com" :class="{ 'error-border': errors.ip }" />
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
          <button class="btn btn-confirm" :disabled="connectivityResult.loading" @click="validateAndSubmit">
            {{ connectivityResult.loading ? 'Validating...' : 'Confirm' }}
          </button>
        </div>
        <div v-if="connectivityResult.message" class="status-panel" :class="connectivityResult.success ? 'status-success' : 'status-fail'">
          <p>{{ connectivityResult.message }}</p>
          <ul v-if="connectivityResult.details.length" class="status-list">
            <li v-for="item in connectivityResult.details" :key="item">{{ item }}</li>
          </ul>
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
              <div
                v-if="isConnected"
                class="progress-fill"
                :style="{ width: initialData.metrics[m] + '%', backgroundColor: getMetricColor(initialData.metrics[m]) }"
              ></div>
            </div>
            <div v-if="!isConnected" class="metric-sub-tip">* SSH required for real-time metrics</div>
          </div>
        </div>

        <div class="port-section">
          <label>MONITORED PORTS</label>
          <ul class="port-status-list">
            <li v-for="portItem in mergedPortStatuses" :key="portItem.port" :title="portItem.message">
              <span class="breath-dot" :class="dotClass(portItem.status)"></span>
              {{ portItem.port }}
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
import { computed, reactive, ref } from 'vue';
import { connectViaSsh, validateNodeConnection } from '../services/networkApi';

const props = defineProps({
  mode: String,
  initialData: Object,
  isConnected: Boolean,
  existingIps: Array
});

const emit = defineEmits(['close', 'submit', 'delete', 'ssh-success', 'refresh-status']);

const view = ref(props.mode === 'add' ? 'form' : 'detail');
const isEditing = ref(false);
const refreshing = ref(false);
const sshPassword = ref('');
const errors = reactive({ ip: false });
const ipErrorMsg = ref('IP is required');
const connectivityResult = reactive({ loading: false, success: false, message: '', details: [] });
const sshResult = reactive({ loading: false, success: false, message: '', metrics: null, target: '' });
const livePortStatuses = ref([]);

const form = reactive({
  name: props.initialData?.name || '',
  ip: props.initialData?.ip || '',
  ports: props.initialData?.ports || '',
  remark: props.initialData?.remark || ''
});

const portList = computed(() =>
  form.ports
    ? form.ports
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : []
);

const mergedPortStatuses = computed(() => {
  if (livePortStatuses.value.length) return livePortStatuses.value;
  if (props.initialData?.portStatuses?.length) return props.initialData.portStatuses;
  return portList.value.map((port) => ({ port, status: 'unknown', message: 'not checked' }));
});

const normalizedTarget = () => form.ip.trim();

const dotClass = (status) => {
  if (status === 'up') return 'active-up';
  if (status === 'degraded') return 'active-degraded';
  if (status === 'down') return 'active-down';
  return 'inactive';
};

const enterSSHView = () => {
  if (!form.ip.trim()) {
    errors.ip = true;
    ipErrorMsg.value = 'Please enter IP first';
    return;
  }
  sshResult.message = '';
  sshResult.metrics = null;
  sshResult.target = '';
  view.value = 'ssh';
};

const mapConnectivityToPortStatuses = (result) =>
  (result.tcpChecks || []).map((check) => ({
    port: String(check.port),
    status: check.status || (check.success ? 'up' : 'down'),
    message: check.message
  }));

const applyConnectivityResult = (result) => {
  const portStatuses = mapConnectivityToPortStatuses(result);

  connectivityResult.success = !!result.success;
  connectivityResult.message = result.message;
  connectivityResult.details = [
    result.resolvedFromDomain ? `DNS: ${result.targetInput} -> ${result.resolvedIp}` : null,
    `Ping: ${result.ping?.message || 'N/A'}`,
    ...(result.tcpChecks || []).map((check) => `TCP ${check.port}: ${check.message}`)
  ].filter(Boolean);

  livePortStatuses.value = portStatuses;
  return portStatuses;
};

const deriveNodeStatus = (result) => {
  if (result.overallStatus) return result.overallStatus;
  if (result.success) return 'online';
  if (result.ping?.status === 'down') return 'offline';
  return 'warning';
};

const refreshNodeStatus = async () => {
  if (!form.ip) return;
  refreshing.value = true;
  try {
    const result = await validateNodeConnection({ target: normalizedTarget(), ports: portList.value });
    const portStatuses = applyConnectivityResult(result);
    if (result.resolvedIp) form.ip = result.resolvedIp;

    if (props.initialData?.id) {
      emit('refresh-status', {
        id: props.initialData.id,
        status: deriveNodeStatus(result),
        portStatuses
      });
    }
  } catch (error) {
    connectivityResult.success = false;
    connectivityResult.message = error.message;
  } finally {
    refreshing.value = false;
  }
};

const handleSSHConnect = async () => {
  if (!sshPassword.value) {
    sshResult.success = false;
    sshResult.message = 'Please input SSH password';
    return;
  }

  sshResult.loading = true;
  sshResult.message = '';
  sshResult.metrics = null;

  try {
    const result = await connectViaSsh({ target: normalizedTarget(), password: sshPassword.value });
    sshResult.success = !!result.success;
    sshResult.message = result.message;
    sshResult.metrics = result.metrics || null;
    sshResult.target = result.target || normalizedTarget();

    if (result.success) {
      emit('ssh-success', {
        id: props.initialData?.id,
        metrics: result.metrics,
        uptime: result.metrics?.uptime
      });
    }
  } catch (error) {
    sshResult.success = false;
    sshResult.message = error.message;
  } finally {
    sshResult.loading = false;
  }
};

const exitSSHView = () => {
  view.value = props.mode === 'add' ? 'form' : isEditing.value ? 'form' : 'detail';
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

const validateAndSubmit = async () => {
  const rawTarget = normalizedTarget();

  if (!rawTarget) {
    errors.ip = true;
    ipErrorMsg.value = 'IP is required';
    return;
  }

  if (form.name && form.name.length > 10) {
    errors.ip = false;
    connectivityResult.success = false;
    connectivityResult.message = 'Node name must be <= 10 characters';
    connectivityResult.details = [];
    return;
  }

  errors.ip = false;
  connectivityResult.loading = true;
  connectivityResult.message = '';
  connectivityResult.details = [];

  try {
    const result = await validateNodeConnection({ target: normalizedTarget(), ports: portList.value });
    const portStatuses = applyConnectivityResult(result);
    if (result.resolvedIp) form.ip = result.resolvedIp;

    const isDuplicateResolvedIp = props.existingIps.includes(result.resolvedIp) && result.resolvedIp !== props.initialData?.ip;
    if (isDuplicateResolvedIp) {
      errors.ip = true;
      ipErrorMsg.value = 'Duplicate IP detected after domain resolve';
      return;
    }

    if (!result.success) return;

    emit('submit', {
      ...form,
      ip: result.resolvedIp || form.ip,
      status: deriveNodeStatus(result),
      portStatuses
    });
    isEditing.value = false;
  } catch (error) {
    connectivityResult.success = false;
    connectivityResult.message = error.message;
  } finally {
    connectivityResult.loading = false;
  }
};

const getMetricColor = (v) => (v > 80 ? '#ff4757' : v > 50 ? '#ffa502' : '#2ed573');
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0.9, 0.9, 0.9, 0.9);
  -webkit-backdrop-filter: blur(90px);
  backdrop-filter: blur(90%);
  display: flex;
  justify-content: center;
  align-items: center;
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
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
}

.top-right-action {
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.ssh-btn-trigger,
.refresh-btn-trigger {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 15px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: 0.3s;
}

.ssh-btn-trigger:hover,
.refresh-btn-trigger:hover {
  background: rgba(255, 255, 255, 0.2);
}

.ssh-btn-trigger:disabled,
.refresh-btn-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remark-display {
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}

.remark-display label {
  font-size: 0.65rem;
  color: #555;
  display: block;
  margin-bottom: 5px;
}

.remark-display p {
  font-size: 0.85rem;
  color: #ccc;
  margin: 0;
  line-height: 1.4;
}

.metric-sub-tip {
  font-size: 0.65rem;
  color: #555;
  margin-top: 4px;
  font-style: italic;
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group label {
  display: block;
  font-size: 0.7rem;
  color: #666;
  margin-bottom: 8px;
}

.input-group input,
.input-group textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  color: white;
  outline: none;
  box-sizing: border-box;
}

.error-border {
  border-color: #ff4757 !important;
}

.error-tip {
  color: #ff4757;
  font-size: 0.65rem;
  margin-top: 5px;
  display: block;
}

.metrics-container {
  margin: 30px 0;
}

.metric-item {
  margin-bottom: 20px;
}

.metric-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.8s ease;
}

.port-status-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

.port-status-list li {
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 15px;
  border-radius: 12px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.breath-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.inactive {
  background: #4b4b4b;
}

.active-up {
  background: #2ed573;
  box-shadow: 0 0 8px #2ed573;
  animation: blink 2s infinite;
}

.active-degraded {
  background: #ffa502;
  box-shadow: 0 0 8px #ffa502;
  animation: blink 2s infinite;
}

.active-down {
  background: #ff4757;
  box-shadow: 0 0 8px #ff4757;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.button-group {
  display: flex;
  gap: 15px;
  margin-top: 40px;
}

.btn {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-confirm {
  background: white;
  color: black;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.btn-danger {
  background: #ff4757;
  color: white;
}

.center {
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.status-panel {
  margin-top: 16px;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.78rem;
  border: 1px solid transparent;
}

.status-success {
  background: rgba(46, 213, 115, 0.12);
  border-color: rgba(46, 213, 115, 0.45);
  color: #9ff3c5;
}

.status-fail {
  background: rgba(255, 71, 87, 0.12);
  border-color: rgba(255, 71, 87, 0.45);
  color: #ffc2c8;
}

.status-list {
  margin: 8px 0 0;
  padding-left: 18px;
}
</style>
