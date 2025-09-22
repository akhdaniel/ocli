<template>
  <select
    :id="id"
    :value="modelValue"
    @change="updateValue"
    :disabled="field.readonly"
    :required="field.required"
    class="form-control"
  >
    <option value="" v-if="!field.required">Select an option</option>
    <option 
      v-for="option in field.selection" 
      :key="option[0]" 
      :value="option[0]"
    >
      {{ option[1] }}
    </option>
  </select>
</template>

<script>
export default {
  name: 'SelectionField',
  props: {
    id: {
      type: String,
      required: true
    },
    modelValue: {
      type: [String, Number],
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
      const value = event.target.value
      // Handle empty value for non-required fields
      if (value === '') {
        emit('update:modelValue', props.field.required ? null : null)
      } else {
        // Try to convert to appropriate type
        let convertedValue = value
        if (props.field.selection) {
          const option = props.field.selection.find(opt => opt[0] === value)
          if (option) {
            // If the option value is a number, convert it
            if (!isNaN(option[0]) && option[0].toString() === value) {
              convertedValue = isNaN(parseFloat(value)) ? value : parseFloat(value)
            }
          }
        }
        emit('update:modelValue', convertedValue)
      }
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
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
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