<template>
  <div class="form-view">
    <div v-if="loading" class="loading">
      <p>Loading form...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="form-container">
      <div class="form-header">
        <h2>{{ formTitle }}</h2>
        <div class="form-actions">
          <button class="btn btn-primary" @click="saveRecord">Save</button>
          <button class="btn btn-secondary" @click="cancelForm">Cancel</button>
        </div>
      </div>
      
      <form @submit.prevent="saveRecord" class="form-content">
        <div 
          v-for="(group, index) in formGroups" 
          :key="group.name || index"
          class="form-group-card"
          :class="getGroupClasses(group)"
        >
          <div v-if="group.title" class="card-header">
            <h3>{{ group.title }}</h3>
          </div>
          
          <div class="card-body">
            <!-- Handle nested groups (columns) -->
            <div 
              v-if="group.columns && group.columns.length > 0"
              class="form-columns"
              :class="`columns-${group.columns.length}`"
            >
              <div 
                v-for="(column, colIndex) in group.columns" 
                :key="colIndex"
                class="form-column"
              >
                <div 
                  v-for="field in column.fields" 
                  :key="field.name"
                  class="form-field"
                  :class="getFieldClass(field)"
                >
                  <label :for="field.name" class="form-label">
                    {{ field.string || field.name }}
                    <span v-if="field.required" class="required">*</span>
                  </label>
                  
                  <component 
                    :is="getFieldComponent(field)"
                    :id="field.name"
                    :field="field"
                    :model-value="record[field.name]"
                    @update:model-value="updateFieldValue(field.name, $event)"
                    class="form-input"
                  />
                </div>
              </div>
            </div>
            
            <!-- Handle regular fields in group -->
            <div v-else>
              <div 
                v-for="field in group.fields" 
                :key="field.name"
                class="form-field"
                :class="getFieldClass(field)"
              >
                <label :for="field.name" class="form-label">
                  {{ field.string || field.name }}
                  <span v-if="field.required" class="required">*</span>
                </label>
                
                <component 
                  :is="getFieldComponent(field)"
                  :id="field.name"
                  :field="field"
                  :model-value="record[field.name]"
                  @update:model-value="updateFieldValue(field.name, $event)"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
      
      <div class="pagination" v-if="records.length > 0">
        <div class="pagination-controls">
          <div class="rows-per-page">
            <label for="rowsPerPage">Rows per page:</label>
            <select id="rowsPerPage" v-model="itemsPerPage" @change="onRowsPerPageChange">
              <option v-for="option in rowsPerPageOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>
          
          <div class="page-navigation">
            <button class="btn btn-outline" :disabled="currentPage === 1" @click="firstPage">First</button>
            <button class="btn btn-outline" :disabled="currentPage === 1" @click="prevPage">Previous</button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button class="btn btn-outline" :disabled="currentPage === totalPages" @click="nextPage">Next</button>
            <button class="btn btn-outline" :disabled="currentPage === totalPages" @click="lastPage">Last</button>
          </div>
          
          <div class="page-info-detail">
            {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, records.length) }} of {{ records.length }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// Field components
import CharField from './fields/CharField.vue'
import IntegerField from './fields/IntegerField.vue'
import FloatField from './fields/FloatField.vue'
import BooleanField from './fields/BooleanField.vue'
import DateField from './fields/DateField.vue'
import DatetimeField from './fields/DatetimeField.vue'
import TextField from './fields/TextField.vue'
import SelectionField from './fields/SelectionField.vue'
import Many2oneField from './fields/Many2oneField.vue'

export default {
  name: 'FormView',
  components: {
    CharField,
    IntegerField,
    FloatField,
    BooleanField,
    DateField,
    DatetimeField,
    TextField,
    SelectionField,
    Many2oneField
  },
  props: {
    modelName: {
      type: String,
      required: true
    },
    recordId: {
      type: [Number, String],
      default: null
    },
    formDefinition: {
      type: Object,
      required: true
    },
    fieldDefinitions: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['save', 'cancel', 'close'],
  setup(props, { emit }) {
    const loading = ref(false)
    const error = ref(null)
    const record = ref({})
    const formStructure = ref([])
    
    // Computed properties
    const formTitle = computed(() => {
      return props.recordId ? `Edit ${props.modelName}` : `New ${props.modelName}`
    })
    
    const formGroups = computed(() => {
      return formStructure.value
    })
    
    // Methods
    const getFieldComponent = (field) => {
      switch (field.type) {
        case 'integer':
          return 'IntegerField'
        case 'float':
          return 'FloatField'
        case 'boolean':
          return 'BooleanField'
        case 'date':
          return 'DateField'
        case 'datetime':
          return 'DatetimeField'
        case 'text':
          return 'TextField'
        case 'selection':
          return 'SelectionField'
        case 'many2one':
          return 'Many2oneField'
        default:
          return 'CharField'
      }
    }
    
    const getFieldClass = (field) => {
      return `field-${field.type} ${field.invisible ? 'hidden' : ''} ${field.readonly ? 'readonly' : ''}`
    }
    
    const getGroupClasses = (group) => {
      const classes = []
      if (group.title) classes.push('has-title')
      if (group.invisible) classes.push('hidden')
      if (group.columns && group.columns.length > 0) classes.push('has-columns')
      return classes.join(' ')
    }
    
    const updateFieldValue = (fieldName, value) => {
      record.value[fieldName] = value
    }
    
    const parseFormStructure = () => {
      try {
        loading.value = true
        error.value = null
        
        // Parse the form XML architecture
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(props.formDefinition.arch, 'text/xml')
        
        // Extract groups from the form
        const groupElements = xmlDoc.querySelectorAll('group')
        const groups = []
        
        if (groupElements.length > 0) {
          // Process groups
          for (let i = 0; i < groupElements.length; i++) {
            const groupElement = groupElements[i]
            const group = parseGroupElement(groupElement)
            groups.push(group)
          }
        } else {
          // No groups found, create a default group with all fields
          const defaultGroup = {
            name: 'default',
            title: '',
            fields: [],
            columns: []
          }
          
          // Extract fields from the form
          const fieldElements = xmlDoc.querySelectorAll('field')
          const fields = []
          
          for (let i = 0; i < fieldElements.length; i++) {
            const fieldElement = fieldElements[i]
            const fieldName = fieldElement.getAttribute('name')
            
            if (!fieldName) continue
            
            const field = createFieldDefinition(fieldName, fieldElement)
            fields.push(field)
          }
          
          defaultGroup.fields = fields
          groups.push(defaultGroup)
        }
        
        formStructure.value = groups
      } catch (err) {
        console.error('Error parsing form structure:', err)
        error.value = 'Failed to parse form structure'
      } finally {
        loading.value = false
      }
    }
    
    const parseGroupElement = (groupElement) => {
      const group = {
        name: groupElement.getAttribute('name') || '',
        title: groupElement.getAttribute('string') || '',
        invisible: groupElement.getAttribute('invisible') === '1' || groupElement.getAttribute('invisible') === 'true',
        fields: [],
        columns: []
      }
      
      // Check for nested groups (columns)
      const nestedGroups = groupElement.querySelectorAll(':scope > group')
      if (nestedGroups.length > 0) {
        // Create columns from nested groups
        const columns = []
        for (let i = 0; i < nestedGroups.length; i++) {
          const nestedGroup = nestedGroups[i]
          const column = {
            fields: []
          }
          
          // Extract fields from nested group
          const fieldElements = nestedGroup.querySelectorAll(':scope > field')
          for (let j = 0; j < fieldElements.length; j++) {
            const fieldElement = fieldElements[j]
            const fieldName = fieldElement.getAttribute('name')
            
            if (!fieldName) continue
            
            const field = createFieldDefinition(fieldName, fieldElement)
            column.fields.push(field)
          }
          
          columns.push(column)
        }
        
        group.columns = columns
      } else {
        // Extract fields directly from this group
        const fieldElements = groupElement.querySelectorAll(':scope > field')
        for (let i = 0; i < fieldElements.length; i++) {
          const fieldElement = fieldElements[i]
          const fieldName = fieldElement.getAttribute('name')
          
          if (!fieldName) continue
          
          const field = createFieldDefinition(fieldName, fieldElement)
          group.fields.push(field)
        }
      }
      
      return group
    }
    
    const createFieldDefinition = (fieldName, fieldElement) => {
      // Get field definition
      let fieldDef = {
        name: fieldName,
        type: 'char',
        string: fieldName.replace(/_/g, ' '),
        required: false,
        readonly: false,
        invisible: false,
        ...props.fieldDefinitions[fieldName]
      }
      
      // Extract attributes from XML
      const attributes = {}
      for (let j = 0; j < fieldElement.attributes.length; j++) {
        const attr = fieldElement.attributes[j]
        attributes[attr.name] = attr.value
      }
      
      // Merge attributes with field definition
      fieldDef = {
        ...fieldDef,
        ...attributes
      }
      
      // Convert string values to boolean
      fieldDef.required = fieldDef.required === '1' || fieldDef.required === 'true' || fieldDef.required === true
      fieldDef.readonly = fieldDef.readonly === '1' || fieldDef.readonly === 'true' || fieldDef.readonly === true
      fieldDef.invisible = fieldDef.invisible === '1' || fieldDef.invisible === 'true' || fieldDef.invisible === true
      
      return fieldDef
    }
    
    const getDefaultFieldValue = (field) => {
      switch (field.type) {
        case 'integer':
        case 'float':
          return field.default_value !== undefined ? field.default_value : 0
        case 'boolean':
          return field.default_value !== undefined ? field.default_value : false
        case 'date':
        case 'datetime':
          return field.default_value !== undefined ? field.default_value : null
        case 'selection':
          return field.default_value !== undefined ? field.default_value : (field.selection && field.selection.length > 0 ? field.selection[0][0] : '')
        default:
          return field.default_value !== undefined ? field.default_value : ''
      }
    }
    
    const loadRecordData = async () => {
      try {
        // Fetch record data from Odoo
        const request = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: props.modelName,
            method: 'read',
            args: [
              [parseInt(props.recordId)],
              formStructure.value.flatMap(group => 
                group.columns && group.columns.length > 0 
                  ? group.columns.flatMap(col => col.fields.map(f => f.name))
                  : group.fields.map(f => f.name)
              )
            ],
            kwargs: {}
          },
          id: Date.now()
        }
        
        const endpointUrl = `/web/dataset/call_kw/${props.modelName}/read`
        const response = await axios.post(endpointUrl, request)
        
        if (response.data.result && response.data.result.length > 0) {
          record.value = response.data.result[0]
        }
      } catch (err) {
        console.error('Error loading record data:', err)
        error.value = 'Failed to load record data'
      }
    }
    
    const saveRecord = async () => {
      try {
        loading.value = true
        
        let result
        if (props.recordId) {
          // Update existing record
          const request = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: props.modelName,
              method: 'write',
              args: [
                [parseInt(props.recordId)],
                record.value
              ],
              kwargs: {}
            },
            id: Date.now()
          }
          
          const endpointUrl = `/web/dataset/call_kw/${props.modelName}/write`
          const response = await axios.post(endpointUrl, request)
          result = response.data.result
        } else {
          // Create new record
          const request = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: props.modelName,
              method: 'create',
              args: [record.value],
              kwargs: {}
            },
            id: Date.now()
          }
          
          const endpointUrl = `/web/dataset/call_kw/${props.modelName}/create`
          const response = await axios.post(endpointUrl, request)
          result = response.data.result
        }
        
        emit('save', result)
      } catch (err) {
        console.error('Error saving record:', err)
        error.value = 'Failed to save record'
      } finally {
        loading.value = false
      }
    }
    
    const cancelForm = () => {
      emit('cancel')
    }
    
    // Lifecycle hooks
    onMounted(() => {
      parseFormStructure()
      if (props.recordId) {
        loadRecordData()
      } else {
        // Initialize with default values
        const defaultRecord = {}
        formStructure.value.forEach(group => {
          if (group.columns && group.columns.length > 0) {
            group.columns.forEach(column => {
              column.fields.forEach(field => {
                defaultRecord[field.name] = getDefaultFieldValue(field)
              })
            })
          } else {
            group.fields.forEach(field => {
              defaultRecord[field.name] = getDefaultFieldValue(field)
            })
          }
        })
        record.value = defaultRecord
      }
    })
    
    return {
      loading,
      error,
      record,
      formStructure,
      formTitle,
      formGroups,
      getFieldComponent,
      getFieldClass,
      getGroupClasses,
      updateFieldValue,
      saveRecord,
      cancelForm
    }
  }
}
</script>

<style scoped>
.form-view {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.loading,
.error {
  padding: 40px;
  text-align: center;
  color: #6c757d;
}

.error {
  color: #dc3545;
}

.form-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eef1f6;
  background-color: #f9fafb;
}

.form-header h2 {
  margin: 0;
  color: #212529;
  font-size: 1.5rem;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.form-content {
  padding: 20px;
}

/* Group Cards */
.form-group-card {
  margin-bottom: 20px;
  border: 1px solid #eef1f6;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.form-group-card.hidden {
  display: none;
}

.card-header {
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eef1f6;
}

.card-header h3 {
  margin: 0;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}

.card-body {
  padding: 20px;
}

.form-group-card:last-child {
  margin-bottom: 0;
}
  margin-bottom: 0;
}


/* Form Columns */
.form-columns {
  display: flex;
  gap: 20px;
}

.form-column {
  flex: 1;
}

/* Responsive columns */
.columns-2 .form-column {
  flex: 1;
}

.columns-3 .form-column {
/* Form Fields */
.form-field {
  margin-bottom: 20px;
}

.form-field:last-child {
  margin-bottom: 0;
}
.form-field {
  margin-bottom: 15px;
.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.form-label .required {
  color: #dc3545;
}
.form-label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}
.form-field.hidden {
  display: none;
}

.form-field.readonly .form-input {
  background-color: #f9fafb;
  opacity: 0.7;
  cursor: not-allowed;
}

.required {
  color: #dc3545;
}

.form-input {
  width: 100%;
}

.hidden {
  display: none;
}

.readonly {
  opacity: 0.7;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-primary:hover {
  background-color: #337ecc;
}

.btn-secondary {
  background-color: #f9fafb;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background-color: #f3f4f6;
}

/* Responsive design */
@media (max-width: 768px) {
  .form-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .form-actions {
    justify-content: center;
  }

@media (max-width: 768px) {
  .form-columns {
    flex-direction: column;
    gap: 15px;
  }
  
  .card-body {
    padding: 15px;
  }
  
  .card-header {
    padding: 12px 15px;
  }
}

@media (max-width: 1024px) {
  .columns-3 .form-column,
  .columns-4 .form-column {
    flex: 1;
  }
}
</style>
