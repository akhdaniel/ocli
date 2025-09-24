<template>
  <div class="action-view">
    <div class="debug-info" v-if="debugMode">
      <p>ActionView Props: {{ JSON.stringify({ modelName: modelName, action: action }, null, 2) }}</p>
    </div>
    
    <div v-if="loading" class="loading">
      <p>Loading records...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="view-content">
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
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import ListView from './ListView.vue'
// import FormView from './FormView.vue' // Commented out unused import

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
    // FormView // Commented out unused component
  },
  props: {
    modelName: {
      type: String,
      required: true
    },
    action: {
      type: Object,
      required: true
    },
    actionDetails: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    console.log('ActionView props received:', { modelName: props.modelName, action: props.action, actionDetails: props.actionDetails })
    
    const debugMode = ref(true) // Set to false in production
    const pageTitle = ref(props.action.name || props.modelName)
    const searchQuery = ref('')
    const loading = ref(false)
    const error = ref(null)
    const records = ref([])
    const filteredRecords = ref([])
    const currentView = ref('list')
    const fields = ref([])
    const searchFilters = ref([])
    const searchDomain = ref([])
    // Pagination state
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    const totalRecords = ref(0)
    // Model fields information
    const modelFieldsInfo = ref({})
    // Form view state
    const currentRecordId = ref(null)
    const formDefinition = ref(null)
    
    // Process search view to extract filters and domains
    const processSearchView = (searchViewDef) => {
      try {
        // Parse the XML architecture to get filters and domains
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(searchViewDef.arch, 'text/xml')
        
        // Extract domain from search element if exists
        const searchElement = xmlDoc.querySelector('search')
        if (searchElement && searchElement.getAttribute('domain')) {
          try {
            // Try to parse the domain string
            const domainStr = searchElement.getAttribute('domain')
            // Simple parsing for common cases - in a real implementation you might need more robust parsing
            if (domainStr.startsWith('[')) {
              searchDomain.value = JSON.parse(domainStr)
            } else {
              // Handle other domain formats as needed
              searchDomain.value = []
            }
          } catch (e) {
            console.warn('Could not parse search domain:', searchElement.getAttribute('domain'))
            searchDomain.value = []
          }
        }
        
        // Extract filters
        const filterElements = xmlDoc.querySelectorAll('filter')
        const filters = []
        for (let i = 0; i < filterElements.length; i++) {
          const filterElement = filterElements[i]
          const filter = {
            name: filterElement.getAttribute('name'),
            string: filterElement.getAttribute('string'),
            domain: filterElement.getAttribute('domain'),
            context: filterElement.getAttribute('context')
          }
          filters.push(filter)
        }
        
        // Extract group_by elements
        const groupByElements = xmlDoc.querySelectorAll('groupby')
        const groupBys = []
        for (let i = 0; i < groupByElements.length; i++) {
          const groupByElement = groupByElements[i]
          const groupBy = {
            name: groupByElement.getAttribute('name'),
            string: groupByElement.getAttribute('string')
          }
          groupBys.push(groupBy)
        }
        
        // Store filters and group_bys
        searchFilters.value = [...filters, ...groupBys]
        
        console.log('Extracted search domain:', searchDomain.value)
        console.log('Extracted search filters:', searchFilters.value)
      } catch (error) {
        console.error('Error processing search view:', error)
        searchFilters.value = []
        searchDomain.value = []
      }
    }
    
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
      console.log('ActionView mounted with props:', props)
      if (props.modelName && props.action) {
        console.log('Loading records for model:', props.modelName)
        loadRecords()
      } else {
        console.log('Missing model name or action, skipping record loading')
        console.log('Model name:', props.modelName)
        console.log('Action:', props.action)
      }
    })
    
    // Pagination methods
    const onPageChange = async (page) => {
      currentPage.value = page
      await loadRecords()
    }
    
    const onItemsPerPageChange = async (itemsPerPageValue) => {
      itemsPerPage.value = itemsPerPageValue
      currentPage.value = 1
      await loadRecords()
    }
    
    // Load records from Odoo using /web/dataset/call_kw/{model_name}/web_search_read endpoint
    const loadRecords = async () => {
      try {
        console.log('Loading records for model:', props.modelName)
        loading.value = true
        
        // Get fields to display
        await loadModelFields()
        
        // Build domain filter
        const domain = buildDomainFilter(props.actionDetails)
        console.log('Built domain filter:', domain)
        
        // Fetch records from the model using the correct endpoint
        const webSearchReadRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: props.modelName,
            method: 'web_search_read',
            args: [],
            kwargs: {
              specification: (() => {
                const spec = {};
                fields.value.forEach(field => {
                  // Handle special fields with known nested structures
                  if (field.name === 'tag_ids') {
                    spec[field.name] = { fields: { display_name: {}, color: {} } };
                  } else if (field.name === 'currency_id' || field.name === 'company_id' || field.name === 'activity_ids') {
                    spec[field.name] = { fields: {} };
                  } else if (field.relation) {
                    // For other relation fields, include display_name by default
                    spec[field.name] = { fields: { display_name: {} } };
                  } else {
                    // For regular fields, empty object
                    spec[field.name] = {};
                  }
                });
                return spec;
              })(),
              domain: domain,
              limit: itemsPerPage.value,
              offset: (currentPage.value - 1) * itemsPerPage.value,
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
            // Update total records count if available
            if (result.length !== undefined) {
              totalRecords.value = result.length
            }
          } else {
            // Fallback
            recordsData = []
            totalRecords.value = 0
          }
          
          records.value = recordsData
          filteredRecords.value = recordsData
          console.log('Records loaded:', recordsData)
        }
      } catch (error) {
        console.error('Error loading records:', error)
        error.value = 'Failed to load records'
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
              [[false, 'list'], [false, 'form'], [false, 'search'], [false, 'kanban']] // Get list and form views
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
          console.log('Get Views Response Result:', result)
          
          // Save model fields information to a variable for later use
          if (result.models && result.models[props.modelName]) {
            modelFieldsInfo.value = result.models[props.modelName]
            console.log('Model fields information:', modelFieldsInfo.value)
          }
          
          // Extract search view definition if available
          let searchViewDef = null
          if (result.views && result.views.search) {
            searchViewDef = result.views.search
            // Process search view to extract filters and domains
            processSearchView(searchViewDef)
          }
          
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
            console.log('Field definitions from response:', fieldDefinitions)
            
            // Also check if there are model fields information in the result
            console.log('Full result structure:', result)

            
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
              // console.log('Processing field element:', fieldElement)
              // console.log('Field name:', fieldName)
              
              // Skip if no field name
              if (!fieldName) {
                console.log('Skipping field element with no name')
                continue
              }
              
              // Check if field should be invisible in column
              const columnInvisible = fieldElement.getAttribute('column_invisible')
              if (columnInvisible === '1' || columnInvisible === 'true' || columnInvisible === 'True') {
                // console.log('Skipping column invisible field:', fieldName)
                continue
              }
              
              // Check if field should be invisible (deprecated but still used)
              const invisible = fieldElement.getAttribute('invisible')
              if (invisible === '1' || invisible === 'true' || invisible === 'True') {
                // console.log('Skipping invisible field:', fieldName)
                continue
              }
              
              // Create field object with available information
              let fieldObj = {
                name: fieldName,
                type: 'char', // Default type if not defined
                string: fieldName.replace(/_/g, ' ') // Default string if not defined
              }
              
              // Add field definition if available from view
              if (fieldDefinitions[fieldName]) {
                console.log('fieldDefinitions[fieldName]===', fieldDefinitions[fieldName])
                // Merge field definition, ensuring type is correctly captured
                fieldObj = {
                  name: fieldName,
                  type: fieldDefinitions[fieldName].type || 'char',
                  string: fieldDefinitions[fieldName].string || fieldName.replace(/_/g, ' '),
                  // Include all other field properties from the definition
                  ...fieldDefinitions[fieldName]
                }
                console.log('Field definition from view for:', fieldName, 'Type:', fieldObj.type)
              } 
              // Fallback to model fields information if available
              else if (modelFieldsInfo.value.fields && modelFieldsInfo.value.fields[fieldName]) {
                // Use model field information
                fieldObj = {
                  name: fieldName,
                  type: modelFieldsInfo.value.fields[fieldName].type || 'char',
                  string: modelFieldsInfo.value.fields[fieldName].string || fieldName.replace(/_/g, ' '),
                  // Include all other field properties from the model
                  ...modelFieldsInfo.value.fields[fieldName]
                }
                console.log('Field definition from model for:', fieldName, 'Type:', fieldObj.type)
              } else {
                console.log('No field definition found for:', fieldName, 'Using defaults')
              }
              
              // Extract additional attributes from the XML element
              const fieldAttributes = {}
              for (let j = 0; j < fieldElement.attributes.length; j++) {
                const attr = fieldElement.attributes[j]
                fieldAttributes[attr.name] = attr.value
              }
              
              // console.log('Field attributes for', fieldName, ':', fieldAttributes)
              
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
    const buildDomainFilter = (actionDetails = null) => {
      let domain = []

      
      console.log('Building domain filter with actionDetails:', actionDetails)
      
      // Apply search domain from search view if available
      if (searchDomain.value && searchDomain.value.length > 0) {
        domain = [...searchDomain.value]
        console.log('Applied search domain:', domain)
      }
      
      // Check for default_search filters in action context
      if (actionDetails && actionDetails.context) {
        console.log('Processing action context:', actionDetails.context)
        // Parse context if it's a string
        let context = actionDetails.context;
        if (typeof actionDetails.context === 'string') {
          try {
            // Try to parse as JSON first
            context = JSON.parse(actionDetails.context);
            console.log('Parsed context from JSON:', context)
          } catch (e) {
            // If JSON parsing fails, try a simpler approach for common cases
            try {
              // Handle common Python dict representations
              const cleanedContext = actionDetails.context
                .replace(/'/g, '"')    // Replace single quotes with double quotes
                .replace(/None/g, 'null')   // Replace None with null
                .replace(/True/g, 'true')   // Replace True with true
                .replace(/False/g, 'false'); // Replace False with false
              context = JSON.parse(cleanedContext);
              console.log('Parsed context from cleaned Python format:', context)
            } catch (e2) {
              console.warn('Could not parse context string:', actionDetails.context, e2);
              context = {};
            }
          }
        }
        
        // Look for keys that start with "default_search_"
        for (const key in context) {
          if (key.startsWith('search_default_')) {
            const filterName = key.substring('search_default_'.length)
            console.log('Found search_default filter:', filterName)
            // Find the filter with this name
            const filter = searchFilters.value.find(f => f.name === filterName)
            console.log('Found filter:', filter)

            console.log('filter===',filter)
            if (filter && filter.domain) {
              try {
                console.log('Processing filter domain:', filter.domain)
                // Parse the domain string into a proper domain object
                let filterDomain = []
                if (typeof filter.domain === 'string') {
                  // Handle different domain formats
                  if (filter.domain.startsWith('[')) {
                    // Try to parse as Python-like format
                    const pythonLikeJson = filter.domain
                      .replace(/\(/g, '[')
                      .replace(/\)/g, ']')
                      .replace(/'/g, '"')
                      .replace(/None/g, 'null')
                      .replace(/True/g, 'true')
                      .replace(/False/g, 'false')
                    filterDomain = JSON.parse(pythonLikeJson)
                    console.log('Parsed filter domain from Python format:', filterDomain)
                  }
                } else if (Array.isArray(filter.domain)) {
                  filterDomain = [...filter.domain]
                  console.log('Filter domain is already an array:', filterDomain)
                }

                console.log('filterDomain==',filterDomain)
                
                // Combine with existing domain
                if (domain.length > 0 && filterDomain.length > 0) {
                  domain = ['&', ...domain, ...filterDomain]
                  console.log('Combined domain with filter:', domain)
                } else if (filterDomain.length > 0) {
                  domain = [...filterDomain]
                  console.log('Set domain to filter domain:', domain)
                }
              } catch (e) {
                console.warn('Could not parse filter domain:', filter.domain, e)
              }
            }
          }
        }
      }
      
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
          
          let actionDomain = []
          if (Array.isArray(props.action.domain)) {
            // Already an array
            actionDomain = [...props.action.domain]
            console.log('Domain is already an array:', actionDomain)
          } else if (typeof props.action.domain === 'string' && props.action.domain.trim() !== '') {
            // String that might be JSON or Python format
            const trimmedDomain = props.action.domain.trim()
            
            // Try JSON parsing first
            try {
              const parsed = JSON.parse(trimmedDomain)
              if (Array.isArray(parsed)) {
                actionDomain = [...parsed]
                console.log('Parsed domain from JSON:', actionDomain)
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
                  actionDomain = [...parsed]
                  console.log('Parsed domain from converted Python format:', actionDomain)
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
          
          // Combine search domain and action domain
          if (domain.length > 0 && actionDomain.length > 0) {
            domain = ['&', ...domain, ...actionDomain]
            console.log('Combined search domain and action domain:', domain)
          } else if (actionDomain.length > 0) {
            domain = [...actionDomain]
            console.log('Set domain to action domain:', domain)
          }
        } catch (e) {
          console.warn('Failed to process action domain:', e)
        }
      } else {
        console.log('No action domain provided')
      }
      
      // Apply search query if exists
      if (searchQuery.value) {
        console.log('Applying search query:', searchQuery.value)
        // Add a search condition for common fields
        const searchConditions = []
        searchConditions.push(['name', 'ilike', searchQuery.value])
        // You might want to search in other fields as well
        
        if (domain.length > 0) {
          domain = ['&', ...domain, ...searchConditions]
          console.log('Combined domain with search conditions:', domain)
        } else {
          domain = searchConditions
          console.log('Set domain to search conditions:', domain)
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
    const onRecordClick = async (record) => {
      console.log('Record clicked:', record)
      // Set the current record ID for editing
      currentRecordId.value = record.id
      // Load form definition if not already loaded
      if (!formDefinition.value) {
        await loadFormDefinition()
      }
      // Switch to form view
      currentView.value = 'form'
    }
    
    // Form event handlers
    // Form event handlers (currently unused but kept for future implementation)
    // const onFormClose = () => {
    //   // Switch back to list view
    //   currentView.value = 'list'
    // }
    
    const loadFormDefinition = async () => {
      try {
        loading.value = true
        
        // Fetch form view definition using get_views endpoint
        const getViewsRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: props.modelName,
            method: 'get_views',
            args: [
              [[false, 'form']] // Get form view
            ],
            kwargs: {
              options: {
                toolbar: false,
                load_filters: false
              }
            }
          },
          id: Date.now() + 2
        }
        
        console.log('Get Form Views Request:', getViewsRequest)
        
        // Use the correct endpoint URL
        const endpointUrl = `/web/dataset/call_kw/${props.modelName}/get_views`
        const response = await axios.post(endpointUrl, getViewsRequest)
        console.log('Get Form Views Response:', response)
        
        if (response.data.result) {
          const result = response.data.result
          
          // Extract form view definition
          let formViewDef = null
          if (result.views && result.views.form) {
            formViewDef = result.views.form
          }
          
          if (formViewDef) {
            formDefinition.value = formViewDef
            console.log('Form definition loaded:', formViewDef)
          } else {
            console.log('No form view definition found')
          }
        }
      } catch (error) {
        console.error('Error loading form definition:', error)
      } finally {
        loading.value = false
      }
    }
    
    return {
      debugMode,
      pageTitle,
      searchQuery,
      loading,
      error,
      records,
      filteredRecords,
      currentView,
      fields,
      searchFilters,
      searchDomain,
      // Pagination state
      currentPage,
      itemsPerPage,
      // Model fields information
      modelFieldsInfo,
      // Form view state
      currentRecordId,
      formDefinition,
      // Computed properties
      availableViews,
      // Methods
      loadRecords,
      onSearchChange,
      applyFilters,
      clearFilters,
      switchView,
      createRecord,
      onRecordClick,
      // Pagination methods
      onPageChange,
      onItemsPerPageChange
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
