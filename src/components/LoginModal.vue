<template>
  <div class="login-overlay" @click.self="$emit('close')">
    <div class="login-card">
      <h2 class="login-title">LOGIN</h2>
      <div class="input-group">
        <label>USERNAME</label>
        <input
          v-model="form.user"
          type="text"
          maxlength="10"
          placeholder="Enter username"
          @keyup.enter="handleSignIn"
        />
      </div>
      <div class="input-group">
        <label>PASSWORD</label>
        <input
          v-model="form.password"
          type="password"
          maxlength="10"
          placeholder="Enter password"
          @keyup.enter="handleSignIn"
        />
      </div>
      <div class="helper-msg">Username / Password max length: 10</div>
      <div v-if="error" class="error-msg">{{ error }}</div>
      <div class="button-group">
        <button class="btn btn-cancel" :disabled="loading" @click="handleSignIn">{{ loading ? 'loading...' : 'sign in' }}</button>
        <button class="btn btn-confirm" :disabled="loading" @click="handleSignUp">{{ loading ? 'loading...' : 'sign up' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { loginApi, signUpApi } from '../services/backendApi';

const emit = defineEmits(['close', 'login-success']);
const error = ref('');
const loading = ref(false);

const form = reactive({
  user: '',
  password: ''
});

const validateInput = () => {
  const username = form.user.trim();
  const password = form.password.trim();

  if (!username || !password) {
    error.value = 'Username and password are required.';
    return null;
  }

  if (username.length > 10 || password.length > 10) {
    error.value = 'Username and password must be <= 10 characters.';
    return null;
  }

  return { username, password };
};

const handleSignIn = async () => {
  const payload = validateInput();
  if (!payload) return;

  loading.value = true;
  error.value = '';
  try {
    const result = await loginApi(payload);
    emit('login-success', result.user);
  } catch (e) {
    error.value = e.message || 'Sign in failed.';
  } finally {
    loading.value = false;
  }
};

const handleSignUp = async () => {
  const payload = validateInput();
  if (!payload) return;

  loading.value = true;
  error.value = '';
  try {
    const result = await signUpApi(payload);
    emit('login-success', result.user);
  } catch (e) {
    error.value = e.message || 'Sign up failed.';
  } finally {
    loading.value = false;
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

.helper-msg {
  color: #888;
  font-size: 0.68rem;
  text-align: center;
  margin: -5px 0 10px;
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

.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { background: rgba(255, 255, 255, 0.1); color: white; }
.btn-confirm { background: white; color: black; }
.btn:hover { opacity: 0.8; transform: translateY(-2px); }
</style>
