<template>
  <textarea
    :id="id"
    :value="modelValue"
    @input="updateValue"
    :disabled="field.readonly"
    :required="field.required"
    class="form-control"
    :placeholder="field.placeholder || ''"
    :rows="field.rows || 4"
  ></textarea>
</template>

<script>
export default {
  name: 'TextField',
  props: {
    id: {
      type: String,
      required: true
    },
    modelValue: {
      type: String,
      default: ''
    },
    field: {
      type: Object,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const updateValue = (event) => {
      emit('update:modelValue', event.target.value)
    }
    
    return {
      updateValue
    }
  }
}
</script>

<style scoped>
.form-control {
  display: block;
  width: 100%;
  padding: 8px 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #374151;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  resize: vertical;
  min-height: 80px;
}

.form-control:focus {
  color: #374151;
  background-color: #fff;
  border-color: #409eff;
  outline: 0;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.form-control:disabled {
  background-color: #f9fafb;
  opacity: 0.7;
  cursor: not-allowed;
}
</style>