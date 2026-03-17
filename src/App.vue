<template>
 <div class="dashboard">
    <div class="top-header">
      <button v-if="!isLoggedIn" class="login-btn" @click="showLogin = true">log in</button>
      <div v-else class="user-info">
        <span>welcome, {{ currentUser || 'user' }}</span>
        <button class="logout-link" @click="isLoggedIn = false">logout</button>
      </div>
    </div>

    <div class="view-container">
      <router-view v-slot="{ Component }">
        <transition :name="transitionName">
          <component :is="Component" class="page-wrapper" :isLoggedIn="isLoggedIn" />
        </transition>
      </router-view>
    </div>

    <nav class="floating-nav">
      <div class="nav-slider" :class="{ 'at-space': route.path === '/space' }"></div>
      <router-link to="/servers" class="nav-btn">servers</router-link>
      <router-link to="/space" class="nav-btn">space</router-link>
    </nav>

    <LoginModal 
      v-if="showLogin" 
      @close="showLogin = false" 
      @login-success="handleLoginSuccess"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import LoginModal from './components/LoginModal.vue';

const route = useRoute();
const transitionName = ref('slide-down');
const showLogin = ref(false);
const isLoggedIn = ref(false);
const currentUser = ref('');

const handleLoginSuccess = (user) => {
  isLoggedIn.value = true;
  currentUser.value = user?.username || 'user';
  showLogin.value = false;
};

watch(() => route.path, (to) => {
  if (to === '/space') {
    transitionName.value = 'slide-down';
  } else if (to === '/servers') {
    transitionName.value = 'slide-up';
  }
});
</script>

<style>
/* --- 登录模块样式 --- */
.top-header {
  position: absolute;
  top: 30px;
  right: 40px;
  z-index: 1100;
}

.login-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: 0.3s;
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.user-info {
  color: white;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.logout-link {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 0.7rem;
  text-decoration: underline;
}

/* --- 基础布局容器 --- */
.dashboard {
  width: 100vw;
  height: 100vh;
  background: #111; /* 纯黑底色能让羽化和星空效果更纯净 */
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: hidden;
  position: relative;
}

.view-container {
  flex: 1;
  position: relative;
}

/* 必须让页面绝对定位，否则切换时会出现瞬间的上下堆叠 */
.page-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  /* 硬件加速，确保模糊动画不卡顿 */
  will-change: transform, opacity, filter;
}


/* Global white scrollbar */
.page-wrapper::-webkit-scrollbar,
.servers-page::-webkit-scrollbar,
.space-canvas::-webkit-scrollbar {
  width: 8px;
}

.page-wrapper::-webkit-scrollbar-track,
.servers-page::-webkit-scrollbar-track,
.space-canvas::-webkit-scrollbar-track {
  background: transparent;
}

.page-wrapper::-webkit-scrollbar-thumb,
.servers-page::-webkit-scrollbar-thumb,
.space-canvas::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
}


/* --- 核心：纵向位移 + 羽化过渡动画 --- */

/* 动画执行时间与曲线 */
.slide-down-enter-active, .slide-down-leave-active,
.slide-up-enter-active, .slide-up-leave-active {
  transition: 
    transform 0.7s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.6s ease,
    filter 0.6s ease;
}

/* 1. 向下切换 (Servers -> Space) */
/* 旧页面(Servers)向下平滑移出 + 羽化消失 */
.slide-down-leave-to {
  transform: translateY(100%);
  opacity: 0;
  filter: blur(20px);
}
/* 新页面(Space)从上方模糊降落 + 消除羽化 */
.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
  filter: blur(20px);
}

/* 2. 向上切换 (Space -> Servers) */
/* 旧页面(Space)向上平滑移出 + 羽化消失 */
.slide-up-leave-to {
  transform: translateY(-100%);
  opacity: 0;
  filter: blur(20px);
}
/* 新页面(Servers)从下方模糊升起 + 消除羽化 */
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
  filter: blur(20px);
}

/* --- 悬浮导航栏 (Nav) --- */
.floating-nav {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 50%;
  height: 60px;
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border-radius: 27px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.nav-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #888;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 2;
  transition: all 0.3s ease;
  border-radius: 23px;
}

/* 按钮悬停发光 */
.nav-btn:hover {
  color: #fff;
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.router-link-active {
  color: #fff !important;
}

/* 导航背景滑块 */
.nav-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 23px;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  z-index: 1;
}

.at-space {
  transform: translateX(100%);
}

</style>