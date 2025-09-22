<template>
  <input
    :id="id"
    :value="formattedValue"
    @input="updateValue"
    :disabled="field.readonly"
    :required="field.required"
    type="date"
    class="form-control"
    :placeholder="field.placeholder || 'YYYY-MM-DD'"
  />
</template>

<script>
export default {
  name: 'DateField',
  props: {
    id: {
      type: String,
      required: true
    },
    modelValue: {
      type: [String, Date],
      default: null
    },
    field: {
      type: Object,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const formattedValue = computed(() => {
      if (!props.modelValue) {
        return ''
      }
      
      // Handle different date formats
      let date
      if (typeof props.modelValue === 'string') {
        // Check if it's in ISO format (YYYY-MM-DD) or datetime format
        if (props.modelValue.includes('T')) {
          // Datetime format
          date = new Date(props.modelValue)
        } else if (props.modelValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Date format
          date = new Date(props.modelValue)
        } else {
          // Try to parse as date string
          date = new Date(props.modelValue)
        }
      } else if (props.modelValue instanceof Date) {
        date = props.modelValue
      } else {
        return ''
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return ''
      }
      
      // Format as YYYY-MM-DD for input[type="date"]
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })
    
    const updateValue = (event) => {
      const value = event.target.value
      if (!value) {
        emit('update:modelValue', props.field.required ? null : null)
      } else {
        // Emit as ISO date string
        emit('update:modelValue', value)
      }
    }
    
    return {
      formattedValue,
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