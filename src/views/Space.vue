<template>
  <div class="space-canvas">
    <div 
      v-for="star in stars" 
      :key="star.id" 
      class="star" 
      :style="{
        top: star.top + '%',
        left: star.left + '%',
        width: star.size + 'px',
        height: star.size + 'px',
        backgroundColor: star.color,
        animationDelay: star.delay + 's' /* 随机闪烁延迟 */
      }"
    ></div>
    
    <div class="space-demo-info">
      Space Servers Universe
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 存储星星数据的响应式数组
const stars = ref([]);

// 生成繁星数据
function generateStars() {
  const TOTAL_STARS = 150; // 你可以调整星星的总数
  for (let i = 0; i < TOTAL_STARS; i++) {
    stars.value.push({
      id: i,
      // 随机位置 (0-100%)
      top: Math.random() * 100, 
      left: Math.random() * 100,
      // 随机大小 (1px 到 3px 之间)
      size: 1 + Math.random() * 2,
      // 随机颜色 (大多数为纯白，少数带微弱的蓝/黄)
      color: getRandomStarColor(),
      // 随机动画延迟 (0s 到 3s 之间)
      delay: Math.random() * 3
    });
  }
}

// 获取随机星星颜色的简单逻辑
function getRandomStarColor() {
  const colors = ['#fff', '#fff', '#fff', '#c0deff', '#ffefd5'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 组件挂载时生成星星
onMounted(() => {
  generateStars();
});
</script>

<style scoped>
/* 宇宙画布样式 */
.space-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* 径向渐变，从中心较亮的深蓝逐渐变黑，营造深邃感 */
  background: radial-gradient(circle at center, #111 0%, #111 100%);
}

/* 基础星星样式 */
.star {
  position: absolute;
  border-radius: 50%;
  opacity: 0; /* 初始透明，由动画控制闪烁 */
  /* 应用名为 'twinkle' 的闪烁动画，无限循环，线性时间函数 */
  animation: twinkle 4s infinite linear;
}

/* 演示信息的临时样式 */
.space-demo-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.2);
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: 2px;
  pointer-events: none; /* 确保文字不干扰交互 */
}
</style>