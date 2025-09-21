<template>
  <div class="action-view">
    <!-- Page Header -->
    <div class="page-header">
      <h1>{{ pageTitle }}</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="createRecord">Create</button>
      </div>
    </div>
    
    <!-- Filter Component -->
    <div class="filter-section">
      <div class="filter-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search..." 
          class="search-input"
          @input="onSearchChange"
        />
        <button class="btn btn-secondary" @click="applyFilters">Apply Filters</button>
        <button class="btn btn-outline" @click="clearFilters">Clear</button>
      </div>
    </div>
    
    <!-- View Type Selector -->
    <div class="view-selector">
      <div class="view-tabs">
        <button 
          v-for="view in availableViews" 
          :key="view.type"
          :class="['view-tab', { active: currentView === view.type }]"
          @click="switchView(view.type)"
        >
          {{ view.label }}
        </button>
      </div>
    </div>
    
    <!-- View Content -->
    <div class="view-content">
      <!-- List View -->
      <ListView 
        v-if="currentView === 'list'"
        :model-name="modelName"
        :fields="fields"
        :records="filteredRecords"
        :loading="loading"
        @record-click="onRecordClick"
      />
      
      <!-- Kanban View -->
      <div v-else-if="currentView === 'kanban'" class="kanban-view">
        <p>Kanban view would be implemented here</p>
      </div>
      
      <!-- Form View -->
      <div v-else-if="currentView === 'form'" class="form-view">
        <p>Form view would be implemented here</p>
      </div>
      
      <!-- Activity View -->
      <div v-else-if="currentView === 'activity'" class="activity-view">
        <p>Activity view would be implemented here</p>
      </div>
      
      <!-- Default View -->
      <div v-else class="default-view">
        <p>Select a view type to display records</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import ListView from './ListView.vue'

// Check if DOMParser is available (it should be in modern browsers)
if (typeof window !== 'undefined' && !window.DOMParser) {
  window.DOMParser = class {
    parseFromString() {
      // Simple fallback for browsers that don't support DOMParser
      // In a real implementation, you might want to use a more robust XML parser
      return {
        getElementsByTagName: () => []
      }
    }
  }
}

export default {
  name: 'ActionView',
  components: {
    ListView
  },
  props: {
    modelName: {
      type: String,
      required: true
    },
    action: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const pageTitle = ref(props.action.name || props.modelName)
    const searchQuery = ref('')
    const loading = ref(false)
    const records = ref([])
    const filteredRecords = ref([])
    const currentView = ref('list')
    const fields = ref([])
    
    // Watch for changes in props
    watch(() => props.action, (newAction, oldAction) => {
      if (newAction && newAction !== oldAction) {
        console.log('Action changed:', newAction)
        pageTitle.value = newAction.name || props.modelName
        // Reset state
        searchQuery.value = ''
        records.value = []
        filteredRecords.value = []
        currentView.value = 'list'
        fields.value = []
        // Load new records
        loadRecords()
      }
    })
    
    // Watch for changes in model name
    watch(() => props.modelName, (newModelName, oldModelName) => {
      if (newModelName && newModelName !== oldModelName) {
        console.log('Model name changed:', newModelName)
        pageTitle.value = props.action.name || newModelName
        // Reset state
        searchQuery.value = ''
        records.value = []
        filteredRecords.value = []
        fields.value = []
        // Load new records
        loadRecords()
      }
    })
    const availableViews = computed(() => {
      const views = []
      const viewModes = props.action.view_mode ? props.action.view_mode.split(',') : ['list']
      
      if (viewModes.includes('list')) {
        views.push({ type: 'list', label: 'List' })
      }
      if (viewModes.includes('kanban')) {
        views.push({ type: 'kanban', label: 'Kanban' })
      }
      if (viewModes.includes('form')) {
        views.push({ type: 'form', label: 'Form' })
      }
      if (viewModes.includes('activity')) {
        views.push({ type: 'activity', label: 'Activity' })
      }
      
      return views
    })
    
    // Load records when component is mounted or when props change
    onMounted(() => {
      if (props.modelName && props.action) {
        loadRecords()
      }
    })
    
    // Load records from Odoo using /web/dataset/call_kw/{model_name}/web_search_read endpoint
    const loadRecords = async () => {
      try {
        loading.value = true
        
        // Get fields to display
        await loadModelFields()
        
        // Build domain filter
        const domain = buildDomainFilter()
        
        // Fetch records from the model using the correct endpoint
        const webSearchReadRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: props.modelName,
            method: 'web_search_read',
            args: [
              domain, // Domain as first argument
              fields.value.map(field => field.name) // Fields as second argument
            ],
            kwargs: {
              limit: 80,
              offset: 0,
              order: '' // No specific ordering
            }
          },
          id: Date.now()
        }
        
        console.log('Web Search Read Request:', webSearchReadRequest)
        
        // Use the correct endpoint URL
        const endpointUrl = `/web/dataset/call_kw/${props.modelName}/web_search_read`
        const response = await axios.post(endpointUrl, webSearchReadRequest)
        console.log('Web Search Read Response:', response)
        
        if (response.data.result) {
          // Extract records from the response
          const result = response.data.result
          let recordsData = []
          
          // Handle different response formats
          if (Array.isArray(result)) {
            // Standard search_read format
            recordsData = result
          } else if (result.records) {
            // web_search_read format
            recordsData = result.records
          } else {
            // Fallback
            recordsData = []
          }
          
          records.value = recordsData
          filteredRecords.value = recordsData
        }
      } catch (error) {
        console.error('Error loading records:', error)
      } finally {
        loading.value = false
      }
    }
    
    // Load model fields using /web/dataset/call_kw/{model_name}/get_views endpoint
    const loadModelFields = async () => {
      try {
        // Fetch fields view definition using the correct endpoint
        const getViewsRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: props.modelName,
            method: 'get_views',
            args: [
              [[false, 'list'], [false, 'form']] // Get list and form views
            ],
            kwargs: {
              options: {
                toolbar: false,
                load_filters: false
              }
            }
          },
          id: Date.now() + 1
        }
        
        console.log('Get Views Request:', getViewsRequest)
        
        // Use the correct endpoint URL
        const endpointUrl = `/web/dataset/call_kw/${props.modelName}/get_views`
        const response = await axios.post(endpointUrl, getViewsRequest)
        console.log('Get Views Response:', response)
        
        if (response.data.result) {
          const result = response.data.result
          
          // Extract list view definition
          let listViewDef = null
          if (result.views && result.views.list) {
            listViewDef = result.views.list
          } else if (result.views && result.views.tree) {
            // Fallback to tree view if list view not available
            listViewDef = result.views.tree
          }
          
          if (listViewDef) {
            // Extract fields from the response
            const fieldDefinitions = listViewDef.fields || {}
            
            // Parse the XML architecture to get field order and visibility
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(listViewDef.arch, 'text/xml')
            
            // Get the list element (could be named 'list' or 'tree')
            let listElement = xmlDoc.querySelector('list') || xmlDoc.querySelector('tree')
            
            // If no list/tree element found, try to get all field elements directly
            let fieldElements = []
            if (listElement) {
              fieldElements = listElement.querySelectorAll('field')
            } else {
              // Fallback to getting all field elements in the document
              fieldElements = xmlDoc.querySelectorAll('field[name]')
            }
            
            // Build field list in the order they appear in the view
            const fieldList = []
            for (let i = 0; i < fieldElements.length; i++) {
              const fieldElement = fieldElements[i]
              const fieldName = fieldElement.getAttribute('name')
              
              // Log each field element we're processing
              console.log('Processing field element:', fieldElement)
              console.log('Field name:', fieldName)
              
              // Skip if no field name
              if (!fieldName) {
                console.log('Skipping field element with no name')
                continue
              }
              
              // Check if field should be invisible in column
              const columnInvisible = fieldElement.getAttribute('column_invisible')
              if (columnInvisible === '1' || columnInvisible === 'true' || columnInvisible === 'True') {
                console.log('Skipping column invisible field:', fieldName)
                continue
              }
              
              // Check if field should be invisible (deprecated but still used)
              const invisible = fieldElement.getAttribute('invisible')
              if (invisible === '1' || invisible === 'true' || invisible === 'True') {
                console.log('Skipping invisible field:', fieldName)
                continue
              }
              
              // Create field object with available information
              let fieldObj = {
                name: fieldName,
                type: 'char', // Default type if not defined
                string: fieldName.replace(/_/g, ' ') // Default string if not defined
              }
              
              // Add field definition if available
              if (fieldDefinitions[fieldName]) {
                fieldObj = {
                  ...fieldObj,
                  ...fieldDefinitions[fieldName]
                }
                console.log('Field definition found for:', fieldName)
              } else {
                console.log('No field definition found for:', fieldName, 'Using defaults')
              }
              
              // Extract additional attributes from the XML element
              const fieldAttributes = {}
              for (let j = 0; j < fieldElement.attributes.length; j++) {
                const attr = fieldElement.attributes[j]
                fieldAttributes[attr.name] = attr.value
              }
              
              console.log('Field attributes for', fieldName, ':', fieldAttributes)
              
              fieldList.push({
                ...fieldObj,
                ...fieldAttributes // Include all XML attributes
              })
            }
            
            console.log('Final field list:', fieldList)
            
            // If no fields found in view, fall back to some defaults
            if (fieldList.length === 0) {
              console.log('No fields found, using defaults')
              fieldList.push(
                { name: 'id', type: 'integer', string: 'ID' },
                { name: 'name', type: 'char', string: 'Name' }
              )
            }
            
            fields.value = fieldList
            console.log('Fields loaded:', fieldList)
          } else {
            console.log('No list view definition found, using defaults')
            fields.value = [
              { name: 'id', type: 'integer', string: 'ID' },
              { name: 'name', type: 'char', string: 'Name' }
            ]
          }
        }
      } catch (error) {
        console.error('Error loading model fields:', error)
        // Fallback to some default fields
        fields.value = [
          { name: 'id', type: 'integer', string: 'ID' },
          { name: 'name', type: 'char', string: 'Name' }
        ]
      }
    }
    
    // Build domain filter based on action domain and search query
    const buildDomainFilter = () => {
      let domain = []
      
      // Apply action domain if exists
      if (props.action.domain) {
        try {
          console.log('Action domain:', props.action.domain)
          
          // The domain might be in different formats:
          // 1. Already an array: ["|", ["name", "=", "Test"], ["state", "=", "draft"]]
          // 2. Stringified array: "[\"|\", [\"name\", \"=\", \"Test\"], [\"state\", \"=\", \"draft\"]]"
          // 3. Python tuple format: [('move_type', 'in', ['out_invoice', 'out_refund'])]
          // 4. Empty string: ""
          // 5. Null/undefined
          
          if (Array.isArray(props.action.domain)) {
            // Already an array
            domain = [...props.action.domain]
            console.log('Domain is already an array:', domain)
          } else if (typeof props.action.domain === 'string' && props.action.domain.trim() !== '') {
            // String that might be JSON or Python format
            const trimmedDomain = props.action.domain.trim()
            
            // Try JSON parsing first
            try {
              const parsed = JSON.parse(trimmedDomain)
              if (Array.isArray(parsed)) {
                domain = [...parsed]
                console.log('Parsed domain from JSON:', domain)
              } else {
                console.warn('Parsed domain is not an array:', parsed)
              }
            } catch (jsonError) {
              // If JSON parsing fails, try to handle Python format
              console.warn('Could not parse action domain as JSON:', trimmedDomain, jsonError)
              
              // Try to convert Python tuple format to JSON
              // This is a simple conversion that works for basic cases
              // In a production app, you might want a more robust Python parser
              try {
                // Replace Python tuple syntax with JSON array syntax
                let pythonLikeJson = trimmedDomain
                  .replace(/\(/g, '[')           // Replace opening parenthesis with bracket
                  .replace(/\)/g, ']')           // Replace closing parenthesis with bracket
                  .replace(/'/g, '"')            // Replace single quotes with double quotes
                  .replace(/None/g, 'null')      // Replace None with null
                  .replace(/True/g, 'true')      // Replace True with true
                  .replace(/False/g, 'false')    // Replace False with false
                
                console.log('Converted Python-like string to JSON-like:', pythonLikeJson)
                
                const parsed = JSON.parse(pythonLikeJson)
                if (Array.isArray(parsed)) {
                  domain = [...parsed]
                  console.log('Parsed domain from converted Python format:', domain)
                } else {
                  console.warn('Parsed domain from Python format is not an array:', parsed)
                }
              } catch (pythonError) {
                console.warn('Could not parse action domain as Python format:', trimmedDomain, pythonError)
              }
            }
          } else if (props.action.domain === null || props.action.domain === undefined) {
            // Domain is null or undefined, keep empty domain
            console.log('Domain is null or undefined')
          }
        } catch (e) {
          console.warn('Failed to process action domain:', e)
        }
      } else {
        console.log('No action domain provided')
      }
      
      // Apply search query if exists
      if (searchQuery.value) {
        // Add a search condition for common fields
        const searchConditions = []
        searchConditions.push(['name', 'ilike', searchQuery.value])
        // You might want to search in other fields as well
        
        if (domain.length > 0) {
          domain = ['&', ...domain, ...searchConditions]
        } else {
          domain = searchConditions
        }
      }
      
      console.log('Built domain filter:', domain)
      return domain
    }
    
    // Handle search input change
    const onSearchChange = () => {
      // Debounce search or apply immediately
      applyFilters()
    }
    
    // Apply filters
    const applyFilters = () => {
      // In a real implementation, you would re-fetch records with the new filters
      // For now, we'll just filter the existing records
      if (!searchQuery.value) {
        filteredRecords.value = [...records.value]
        return
      }
      
      const query = searchQuery.value.toLowerCase()
      filteredRecords.value = records.value.filter(record => {
        // Simple search in all fields
        for (const field of fields.value) {
          const value = record[field.name]
          if (value && value.toString().toLowerCase().includes(query)) {
            return true
          }
        }
        return false
      })
    }
    
    // Clear filters
    const clearFilters = () => {
      searchQuery.value = ''
      filteredRecords.value = [...records.value]
    }
    
    // Switch view mode
    const switchView = (viewType) => {
      currentView.value = viewType
    }
    
    // Create new record
    const createRecord = () => {
      console.log('Creating new record for model:', props.modelName)
      // Implementation for creating a new record
    }
    
    // Handle record click
    const onRecordClick = (record) => {
      console.log('Record clicked:', record)
      // Implementation for handling record click (e.g., open form view)
    }
    
    return {
      pageTitle,
      searchQuery,
      loading,
      records,
      filteredRecords,
      currentView,
      fields,
      availableViews,
      loadRecords,
      onSearchChange,
      applyFilters,
      clearFilters,
      switchView,
      createRecord,
      onRecordClick
    }
  }
}
</script>

<style scoped>
.action-view {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eef1f6;
}

.page-header h1 {
  margin: 0;
  color: #212529;
  font-size: 1.7rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-section {
  margin-bottom: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-container {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  flex: 1;
  max-width: 300px;
}

.search-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.view-selector {
  margin-bottom: 20px;
}

.view-tabs {
  display: flex;
  border-bottom: 1px solid #eef1f6;
}

.view-tab {
  padding: 10px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6c757d;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.view-tab:hover {
  color: #409eff;
}

.view-tab.active {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

.view-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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

.btn-outline {
  background-color: transparent;
  color: #6c757d;
  border: 1px solid #d1d5db;
}

.btn-outline:hover {
  background-color: #f9fafb;
}

.kanban-view,
.form-view,
.activity-view,
.default-view {
  padding: 40px;
  text-align: center;
  color: #6c757d;
}
</style>