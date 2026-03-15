<template>
  <div class="login-overlay" @click.self="$emit('close')">
    <div class="login-card">
      <h2 class="login-title">LOGIN</h2>
      <div class="input-group">
        <label>USERNAME</label>
        <input v-model="form.user" type="text" placeholder="Enter username" />
      </div>
      <div class="input-group">
        <label>PASSWORD</label>
        <input v-model="form.password" type="password" placeholder="••••••" />
      </div>
      <div v-if="error" class="error-msg">Username or password error.</div>
      <div class="button-group">
        <button class="btn btn-cancel" @click="$emit('close')">cancel</button>
        <button class="btn btn-confirm" @click="handleLogin">confirm</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';

const emit = defineEmits(['close', 'login-success']);
const error = ref(false);

const form = reactive({
  user: '',
  password: ''
});

const handleLogin = () => {
  // 验证唯一账号
  if (form.user === 'stephen' && form.password === '666666') {
    error.value = false;
    emit('login-success');
  } else {
    error.value = true;
  }
};
</script>

<style scoped>
.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  /* 背景虚化与遮罩 */
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(25px); 
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.login-card {
  width: 320px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  color: white;
}

.login-title {
  text-align: center;
  font-weight: 300;
  letter-spacing: 2px;
  margin-bottom: 25px;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  font-size: 0.7rem;
  color: #888;
  margin-bottom: 5px;
}

.input-group input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  color: white;
  outline: none;
  box-sizing: border-box;
}

.input-group input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.error-msg {
  color: #ff4757;
  font-size: 0.75rem;
  text-align: center;
  margin-bottom: 10px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  transition: 0.3s;
}

.btn-cancel { background: rgba(255, 255, 255, 0.1); color: white; }
.btn-confirm { background: white; color: black; }
.btn:hover { opacity: 0.8; transform: translateY(-2px); }
</style>