<template>
  <div class="space-canvas">
    <div v-for="star in backgroundStars" :key="star.id" class="bg-star" :style="star.style"></div>

    <template v-if="isLoggedIn">
      <div
        v-for="galaxy in galaxies"
        :key="galaxy.id"
        class="galaxy"
        :style="{ left: galaxy.x + '%', top: galaxy.y + '%' }"
        @mousemove="onGalaxyHover($event, galaxy.id)"
        @mouseleave="onGalaxyLeave(galaxy.id)"
      >
        <div class="galaxy-core" :style="coreStyle(galaxy.nodeStatus, galaxy.id)">
          <div class="star-title node-title">{{ galaxy.title }}</div>
        </div>

        <svg class="orbit-links" viewBox="0 0 260 260" preserveAspectRatio="none">
          <line
            v-for="port in galaxy.ports"
            :key="`link-${galaxy.id}-${port.port}`"
            :x1="centerPoint(galaxy.id).x"
            :y1="centerPoint(galaxy.id).y"
            :x2="port.x"
            :y2="port.y"
            stroke="#ffffff"
          />
        </svg>

        <div
          v-for="port in galaxy.ports"
          :key="`port-${galaxy.id}-${port.port}`"
          class="port-star"
          :style="{
            left: `${(port.x / 260) * 100}%`,
            top: `${(port.y / 260) * 100}%`,
            backgroundColor: statusColor(port.status),
            boxShadow: `0 0 10px ${statusColor(port.status)}`
          }"
          :title="port.message"
        >
          <div class="star-title port-title">{{ port.port }}</div>
        </div>
      </div>
    </template>

    <div v-else class="space-demo-info">Please log in to explore server universe.</div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { serverList } from '../stores/serverUniverse';

defineProps({ isLoggedIn: Boolean });

const hoverStates = reactive({});
const backgroundStars = ref([]);

const statusColor = (status) => {
  if (status === 'up' || status === 'online') return '#2ed573';
  if (status === 'degraded' || status === 'warning') return '#ffa502';
  if (status === 'down' || status === 'offline') return '#ff4757';
  return '#9ba3ad';
};

const centerPoint = (galaxyId) => ({
  x: 130 + (hoverStates[galaxyId]?.x || 0),
  y: 130 + (hoverStates[galaxyId]?.y || 0)
});

const coreStyle = (status, galaxyId) => {
  const color = statusColor(status);
  return {
    boxShadow: `0 0 20px ${color}, 0 0 60px ${color}55`,
    background: `radial-gradient(circle, ${color} 0%, #ffffff 35%, #111 100%)`,
    transform: `translate(${hoverStates[galaxyId]?.x || 0}px, ${hoverStates[galaxyId]?.y || 0}px)`
  };
};

const generateBackgroundStars = () => {
  const total = 140;
  backgroundStars.value = Array.from({ length: total }, (_, i) => {
    const size = 1 + Math.random() * 2.2;
    return {
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: `${0.25 + Math.random() * 0.65}`,
        animationDelay: `${Math.random() * 3.5}s`
      }
    };
  });
};

const toPorts = (server) => {
  const fromStatuses = server.portStatuses?.length
    ? server.portStatuses
    : (server.ports || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((port) => ({ port, status: 'unknown', message: 'not checked' }));

  return fromStatuses.map((item, idx) => {
    const total = fromStatuses.length;
    const angle = (Math.PI * 2 * idx) / Math.max(total, 1);
    const radius = 64 + (idx % 3) * 18;
    return {
      ...item,
      x: 130 + Math.cos(angle) * radius,
      y: 130 + Math.sin(angle) * radius
    };
  });
};

const galaxies = computed(() =>
  serverList.value.map((server, idx) => ({
    id: server.id,
    title: server.name || server.ip,
    nodeStatus: server.status || 'unknown',
    x: 18 + (idx % 4) * 24,
    y: 24 + Math.floor(idx / 4) * 28,
    ports: toPorts(server)
  }))
);

const onGalaxyHover = (event, galaxyId) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const dx = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
  const dy = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
  hoverStates[galaxyId] = { x: dx, y: dy };
};

const onGalaxyLeave = (galaxyId) => {
  hoverStates[galaxyId] = { x: 0, y: 0 };
};

onMounted(() => {
  generateBackgroundStars();
});
</script>

<style scoped>
.space-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(255, 255, 255, 0.3);
}

.bg-star {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  animation: twinkle 4s infinite ease-in-out;
}

.galaxy {
  position: absolute;
  width: 260px;
  height: 260px;
  transform: translate(-50%, -50%);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.galaxy:hover {
  transform: translate(-50%, -50%) scale(1.04);
}

.galaxy-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.35s ease-out, box-shadow 0.35s ease-out;
}

.orbit-links {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.orbit-links line {
  stroke-width: 1.4;
  opacity: 0.68;
}

.port-star {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.35s ease-out;
}

.galaxy:hover .port-star {
  transform: translate(-50%, -50%) scale(1.18);
}

.star-title {
  position: absolute;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.68rem;
  letter-spacing: 0.4px;
}

.node-title {
  left: 50%;
  top: -16px;
  transform: translateX(-50%);
}

.port-title {
  left: 50%;
  top: -13px;
  transform: translateX(-50%);
}

.space-demo-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.1rem;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.95;
  }
}
</style>
