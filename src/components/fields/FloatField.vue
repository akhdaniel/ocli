<template>
  <input
    :id="id"
    :value="modelValue"
    @input="updateValue"
    @blur="formatValue"
    :disabled="field.readonly"
    :required="field.required"
    type="text"
    class="form-control"
    :placeholder="getPlaceholder()"
  />
</template>

<script>
export default {
  name: 'FloatField',
  props: {
    id: {
      type: String,
      required: true
    },
    modelValue: {
      type: [Number, String],
      default: 0
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
    
    const formatValue = (event) => {
      const value = event.target.value
      if (value === '' || value === null || value === undefined) {
        emit('update:modelValue', props.field.required ? 0 : null)
      } else {
        const parsed = parseFloat(value)
        if (isNaN(parsed)) {
          emit('update:modelValue', props.field.required ? 0 : null)
        } else {
          // Apply decimal precision if specified
          let formatted = parsed
          if (props.field.digits && props.field.digits[1] !== undefined) {
            formatted = parseFloat(parsed.toFixed(props.field.digits[1]))
          }
          emit('update:modelValue', formatted)
        }
      }
    }
    
    const getPlaceholder = () => {
      if (props.field.placeholder) {
        return props.field.placeholder
      }
      if (props.field.digits) {
        return `Enter a decimal number (${props.field.digits[1]} decimal places)`
      }
      return 'Enter a decimal number'
    }
    
    return {
      updateValue,
      formatValue,
      getPlaceholder
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