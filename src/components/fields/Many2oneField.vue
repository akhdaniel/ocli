<template>
  <div class="many2one-field">
    <div class="input-group">
      <input
        :id="`${id}_input`"
        :value="displayText"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        :disabled="field.readonly"
        :required="field.required"
        type="text"
        class="form-control"
        :placeholder="field.placeholder || 'Start typing to search...'"
        autocomplete="off"
      />
      <button 
        v-if="modelValue && !field.readonly" 
        type="button" 
        class="clear-button"
        @click="clearValue"
        title="Clear selection"
      >
        ×
      </button>
    </div>
    
    <!-- Search results dropdown -->
    <div 
      v-if="showResults && searchResults.length > 0" 
      class="search-results"
      @mousedown="onResultsMouseDown"
    >
      <div 
        v-for="result in searchResults" 
        :key="result[0]"
        class="search-result-item"
        @click="selectResult(result)"
      >
        {{ result[1] }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

export default {
  name: 'Many2oneField',
  props: {
    id: {
      type: String,
      required: true
    },
    modelValue: {
      type: [Array, Object],
      default: null
    },
    field: {
      type: Object,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const searchQuery = ref('')
    const searchResults = ref([])
    const showResults = ref(false)
    const isSearching = ref(false)
    const resultsMouseDown = ref(false)
    
    // Computed properties
    const displayText = computed(() => {
      if (!props.modelValue) {
        return searchQuery.value
      }
      
      // Handle [id, name] format
      if (Array.isArray(props.modelValue) && props.modelValue.length >= 2) {
        return props.modelValue[1]
      }
      
      // Handle object with display_name
      if (props.modelValue && typeof props.modelValue === 'object') {
        if (props.modelValue.display_name) {
          return props.modelValue.display_name
        }
        if (props.modelValue.name) {
          return props.modelValue.name
        }
      }
      
      return searchQuery.value
    })
    
    // Methods
    const onInput = (event) => {
      const value = event.target.value
      searchQuery.value = value
      emit('update:modelValue', value) // Emit raw text during search
      
      if (value.length >= 2) {
        searchRecords(value)
      } else {
        searchResults.value = []
        showResults.value = false
      }
    }
    
    const onFocus = () => {
      if (searchQuery.value.length >= 2) {
        searchRecords(searchQuery.value)
      }
    }
    
    const onBlur = () => {
      // Delay hiding results to allow for clicks on results
      setTimeout(() => {
        if (!resultsMouseDown.value) {
          showResults.value = false
        }
        resultsMouseDown.value = false
      }, 200)
    }
    
    const onResultsMouseDown = () => {
      resultsMouseDown.value = true
    }
    
    const searchRecords = async (query) => {
      if (!props.field.relation) {
        return
      }
      
      try {
        isSearching.value = true
        
        // Search for records in the related model
        const request = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: props.field.relation,
            method: 'name_search',
            args: [],
            kwargs: {
              name: query,
              args: [],
              operator: 'ilike',
              limit: 10
            }
          },
          id: Date.now()
        }
        
        const endpointUrl = `/web/dataset/call_kw/${props.field.relation}/name_search`
        const response = await axios.post(endpointUrl, request)
        
        if (response.data.result) {
          searchResults.value = response.data.result
          showResults.value = response.data.result.length > 0
        }
      } catch (err) {
        console.error('Error searching records:', err)
        searchResults.value = []
        showResults.value = false
      } finally {
        isSearching.value = false
      }
    }
    
    const selectResult = (result) => {
      searchQuery.value = result[1] // Set display text
      showResults.value = false
      emit('update:modelValue', result) // Emit [id, name] array
    }
    
    const clearValue = () => {
      searchQuery.value = ''
      searchResults.value = []
      showResults.value = false
      emit('update:modelValue', null)
    }
    
    // Click outside handler
    const handleClickOutside = (event) => {
      const element = document.getElementById(props.id)
      if (element && !element.contains(event.target)) {
        showResults.value = false
      }
    }
    
    // Lifecycle hooks
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })
    
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })
    
    return {
      searchQuery,
      searchResults,
      showResults,
      isSearching,
      resultsMouseDown,
      displayText,
      onInput,
      onFocus,
      onBlur,
      onResultsMouseDown,
      selectResult,
      clearValue
    }
  }
}
</script>

<style scoped>
.many2one-field {
  position: relative;
  width: 100%;
}

.input-group {
  position: relative;
  display: flex;
  align-items: stretch;
}

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
  border-radius: 6px 0 0 6px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  flex: 1 1 auto;
}

.form-control:focus {
  color: #374151;
  background-color: #fff;
  border-color: #409eff;
  outline: 0;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.clear-button {
  padding: 8px 12px;
  background-color: #f9fafb;
  border: 1px solid #d1d5db;
  border-left: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  font-size: 18px;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
}

.search-result-item:hover {
  background-color: #f9fafb;
}

.search-result-item:last-child {
  border-bottom: none;
}

.form-control:disabled {
  background-color: #f9fafb;
  opacity: 0.7;
  cursor: not-allowed;
}

.form-control:disabled + .clear-button {
  background-color: #f9fafb;
  opacity: 0.7;
  cursor: not-allowed;
}
</style>