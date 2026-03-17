<template>
  <div class="space-canvas">
    <div v-for="star in backgroundStars" :key="star.id" class="bg-star" :style="star.style"></div>

    <template v-if="isLoggedIn">
      <div class="universe-layer" :style="{ minHeight: `${universeHeight}px` }">
        <div
          v-for="galaxy in galaxies"
          :key="galaxy.id"
          class="galaxy"
          :style="{ left: `${galaxy.xPercent}%`, top: `${galaxy.yPx}px` }"
        >
          <div class="galaxy-core" :style="coreStyle(galaxy.nodeStatus)">
            <div class="star-title node-title">{{ galaxy.title }}</div>
          </div>

          <div
            v-for="port in galaxy.ports"
            :key="`port-${galaxy.id}-${port.port}`"
            class="orbit-ring"
            :style="{
              '--orbit-angle': `${port.angle}deg`,
              '--orbit-radius': `${port.radius}px`,
              '--orbit-duration': `${port.duration}s`
            }"
            :title="port.message"
          >
            <div class="port-star" :style="{ backgroundColor: statusColor(port.status), boxShadow: `0 0 10px ${statusColor(port.status)}` }">
              <div class="star-title port-title">{{ port.port }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="space-demo-info">Please log in to explore server universe.</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { serverList } from '../stores/serverUniverse';

defineProps({ isLoggedIn: Boolean });

const backgroundStars = ref([]);

const statusColor = (status) => {
  if (status === 'up' || status === 'online') return '#2ed573';
  if (status === 'degraded' || status === 'warning') return '#ffa502';
  if (status === 'down' || status === 'offline') return '#ff4757';
  return '#9ba3ad';
};

const coreStyle = (status) => {
  const color = statusColor(status);
  return {
    boxShadow: `0 0 20px ${color}, 0 0 60px ${color}55`,
    background: `radial-gradient(circle, ${color} 0%, #ffffff 35%, #111 100%)`
  };
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const universeHeight = computed(() => {
  const base = 1800;
  const extra = Math.max(0, serverList.value.length - 3) * 220;
  return base + extra;
});

const generateBackgroundStars = () => {
  const total = 180;
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
    const seed = Number(server.id) * 100 + idx;
    return {
      ...item,
      angle: Math.floor(seededRandom(seed + 1) * 360),
      radius: 56 + Math.floor(seededRandom(seed + 2) * 46),
      duration: 14 + Math.floor(seededRandom(seed + 3) * 12)
    };
  });
};

const galaxies = computed(() =>
  serverList.value.map((server, idx) => {
    const seedBase = Number(server.id) * 77 + idx * 13;
    const xPercent = 15 + seededRandom(seedBase + 1) * 70;
    const yPx = 180 + seededRandom(seedBase + 2) * Math.max(universeHeight.value - 260, 300);

    return {
      id: server.id,
      title: server.name || server.ip,
      nodeStatus: server.status || 'unknown',
      xPercent,
      yPx,
      ports: toPorts(server)
    };
  })
);

onMounted(() => {
  generateBackgroundStars();
});
</script>

<style scoped>
.space-canvas {
  position: relative;
  width: 100%;
  min-height: 100%;
  overflow: visible;
  background: radial-gradient(circle at center, #0c111b 0%, #05070c 70%, #020202 100%);
}

.universe-layer {
  position: relative;
  width: 100%;
  padding-bottom: 120px;
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
  transform: translate(-50%, -50%) scale(1.05);
}

.galaxy-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: box-shadow 0.35s ease-out;
}

.orbit-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform: rotate(var(--orbit-angle));
  transform-origin: center;
  animation: orbit-spin var(--orbit-duration) linear infinite;
}

.galaxy:hover .orbit-ring {
  animation-play-state: paused;
}

.port-star {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translateX(var(--orbit-radius));
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

@keyframes orbit-spin {
  from {
    transform: rotate(var(--orbit-angle));
  }
  to {
    transform: rotate(calc(var(--orbit-angle) + 360deg));
  }
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
