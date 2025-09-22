<template>
  <div class="boolean-field">
    <input
      :id="id"
      :checked="modelValue"
      @change="updateValue"
      :disabled="field.readonly"
      type="checkbox"
      class="form-checkbox"
    />
    <label :for="id" class="checkbox-label" v-if="field.string">{{ field.string }}</label>
  </div>
</template>

<script>
export default {
  name: 'BooleanField',
  props: {
    id: {
      type: String,
      required: true
    },
    modelValue: {
      type: Boolean,
      default: false
    },
    field: {
      type: Object,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const updateValue = (event) => {
      emit('update:modelValue', event.target.checked)
    }
    
    return {
      updateValue
    }
  }
}
</script>

<style scoped>
.boolean-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  background-color: #fff;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  position: relative;
}

.form-checkbox:checked {
  background-color: #409eff;
  border-color: #409eff;
}

.form-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.form-checkbox:disabled {
  background-color: #f9fafb;
  opacity: 0.7;
  cursor: not-allowed;
}

.checkbox-label {
  margin: 0;
  font-weight: normal;
  color: #374151;
  cursor: pointer;
}

.form-checkbox:focus {
  outline: 0;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}
</style>