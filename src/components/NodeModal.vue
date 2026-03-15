<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="node-card">
      <h2 class="modal-title">{{ isEditMode ? 'Node Details' : 'Add New Node' }}</h2>
      
      <div class="form-grid">
        <div class="input-group">
          <label>NAME</label>
          <input v-model="form.name" :disabled="isReadonly" placeholder="e.g. Mac Mini M4" />
        </div>
        <div class="input-group">
          <label>IP ADDRESS</label>
          <input v-model="form.ip" :disabled="isReadonly" placeholder="0.0.0.0" />
        </div>
        <div class="input-group">
          <label>PASSWORD</label>
          <input v-model="form.password" type="password" :disabled="isReadonly" placeholder="••••••" />
        </div>
        <div class="input-group">
          <label>PORTS</label>
          <input v-model="form.ports" :disabled="isReadonly" placeholder="e.g. 80, 443, 3000" />
        </div>
        <div class="input-group full-width">
          <label>REMARK</label>
          <textarea v-model="form.remark" :disabled="isReadonly" rows="3" placeholder="Server notes..."></textarea>
        </div>
      </div>

      <div class="button-group">
        <template v-if="mode === 'add'">
          <button class="btn btn-cancel" @click="$emit('close')">cancel</button>
          <button class="btn btn-add" @click="handleSubmit">Add</button>
        </template>

        <template v-else>
          <button v-if="!isEditing" class="btn btn-delete" @click="handleDelete">delete</button>
          <button v-if="!isEditing" class="btn btn-confirm" @click="isEditing = true">modify</button>
          
          <button v-if="isEditing" class="btn btn-cancel" @click="isEditing = false">cancel</button>
          <button v-if="isEditing" class="btn btn-confirm" @click="handleSubmit">confirm</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const props = defineProps({
  mode: { type: String, default: 'add' }, // 'add' 或 'edit'
  initialData: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['close', 'submit', 'delete']);

const isEditing = ref(false);
const isReadonly = computed(() => props.mode === 'edit' && !isEditing.value);
const isEditMode = computed(() => props.mode === 'edit');

const form = reactive({
  name: props.initialData.name || '',
  ip: props.initialData.ip || '',
  password: props.initialData.password || '',
  ports: props.initialData.ports || '',
  remark: props.initialData.remark || ''
});

const handleSubmit = () => {
  emit('submit', { ...form });
  isEditing.value = false;
};

const handleDelete = () => {
  if (confirm('Are you sure to delete this node?')) {
    emit('delete');
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  display: flex; justify-content: center; align-items: center;
  z-index: 3000;
}

.node-card {
  width: 450px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 30px;
  color: white;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}

.modal-title { font-weight: 300; margin-bottom: 25px; text-align: center; letter-spacing: 1px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.full-width { grid-column: span 2; }

.input-group label { display: block; font-size: 0.65rem; color: #777; margin-bottom: 5px; }
.input-group input, .input-group textarea {
  width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 10px; color: white; outline: none; box-sizing: border-box;
}
.input-group input:disabled, .input-group textarea:disabled { color: #888; border-color: transparent; }

.button-group { display: flex; gap: 12px; margin-top: 30px; }
.btn { flex: 1; padding: 12px; border-radius: 12px; border: none; cursor: pointer; transition: 0.3s; font-weight: 500; }
.btn-cancel { background: rgba(255,255,255,0.08); color: white; }
.btn-add, .btn-confirm { background: white; color: black; }
.btn-delete { background: rgba(255, 71, 87, 0.2); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); }
.btn:hover { transform: translateY(-2px); opacity: 0.9; }
</style>