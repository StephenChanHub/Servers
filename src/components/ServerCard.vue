<template>
  <div class="server-card">
    <div class="card-header">
      <div class="server-info">
        <h3 class="server-name">{{ server.name }}</h3>
        <span class="server-ip">{{ server.ip }}</span>
      </div>
      <div class="status-indicator">
        <div class="status-dot" :class="server.status"></div>
        <span class="status-text">{{ server.status }}</span>
      </div>
    </div>

    <div class="metrics-container">
      <div class="metric-item" v-for="(val, key) in server.metrics" :key="key">
        <div class="metric-label">
          <span>{{ key.toUpperCase() }}</span>
          <span>{{ val }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: val + '%', backgroundColor: getMetricColor(val) }"></div>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <div class="detail-item">
        <span class="label">UPTIME</span>
        <span class="value">{{ server.uptime }}</span>
      </div>
      <div class="detail-item">
        <span class="label">PORTS</span>
        <span class="value">{{ server.activePorts }}</span>
      </div>
    </div>

    <div class="port-preview" v-if="portPreview.length">
      <span class="label">PORT STATUS</span>
      <div class="preview-list">
        <span v-for="item in portPreview" :key="item.port" class="preview-item">
          <i class="status-mini-dot" :class="dotClass(item.status)"></i>{{ item.port }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  server: Object
});

const portPreview = computed(() => (props.server.portStatuses || []).slice(0, 4));

const getMetricColor = (val) => {
  if (val > 80) return '#ff4757';
  if (val > 50) return '#ffa502';
  return '#2ed573';
};

const dotClass = (status) => {
  if (status === 'up') return 'dot-up';
  if (status === 'degraded') return 'dot-degraded';
  if (status === 'down') return 'dot-down';
  return 'dot-unknown';
};
</script>

<style scoped>
.server-card { width: 320px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 24px; color: white; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
.server-card:hover { transform: translateY(-8px); border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 15px 45px rgba(255, 255, 255, 0.1); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
.server-name { margin: 0; font-size: 1.25rem; font-weight: 600; letter-spacing: 0.5px; }
.server-ip { font-size: 0.8rem; color: #888; }
.status-indicator { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.online { background: #2ed573; box-shadow: 0 0 10px #2ed573; }
.status-dot.warning { background: #ffa502; box-shadow: 0 0 10px #ffa502; }
.status-dot.offline { background: #ff4757; box-shadow: 0 0 10px #ff4757; }
.status-text { font-size: 0.7rem; text-transform: uppercase; color: #888; }
.metrics-container { margin-bottom: 25px; }
.metric-item { margin-bottom: 12px; }
.metric-label { display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 6px; color: #ccc; }
.progress-bar { width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; transition: width 1s ease-in-out; }
.card-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 15px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.label { font-size: 0.65rem; color: #666; }
.value { font-size: 0.9rem; font-weight: 500; }
.port-preview { margin-top: 10px; }
.preview-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.preview-item { font-size: 0.72rem; color: #d7d7d7; display: inline-flex; align-items: center; gap: 5px; }
.status-mini-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.dot-up { background: #2ed573; }
.dot-degraded { background: #ffa502; }
.dot-down { background: #ff4757; }
.dot-unknown { background: #4b4b4b; }
</style>
