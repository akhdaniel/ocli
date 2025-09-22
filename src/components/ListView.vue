<template>
  <div class="list-view">
    <div v-if="loading" class="loading">
      <p>Loading records...</p>
    </div>
    
    <div v-else-if="records.length === 0" class="no-records">
      <p>No records found</p>
    </div>
    
    <div v-else>
      <!-- Pagination controls at the top -->
      <div class="pagination" v-if="records.length > 0">
        <div class="pagination-controls">
          <div class="rows-per-page">
            <label for="rowsPerPage">Rows per page:</label>
            <select id="rowsPerPage" :value="itemsPerPage" @change="onRowsPerPageChange">
              <option v-for="option in rowsPerPageOptions" :key="option" :value="option" :selected="option === itemsPerPage">
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
            {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, totalRecords) }} of {{ totalRecords }}
          </div>
        </div>
      </div>
      
      <!-- Table container -->
      <div class="table-container">
        <table class="list-table">
          <thead>
            <tr>
              <th 
                v-for="field in displayableFields" 
                :key="field.name"
                class="table-header"
              >
                {{ field.string || field.name }}
              </th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="record in paginatedRecords" 
              :key="record.id"
              class="table-row"
              @click="onRowClick(record)"
            >
              <td 
                v-for="field in displayableFields" 
                :key="field.name"
                class="table-cell"
              >
                {{ formatFieldValue(record[field.name], field) }}
              </td>
              <td class="actions-cell">
                <button class="action-button" @click.stop="editRecord(record)">Edit</button>
                <button class="action-button delete" @click.stop="deleteRecord(record)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ListView',
  props: {
    modelName: {
      type: String,
      required: true
    },
    fields: {
      type: Array,
      default: () => []
    },
    records: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    totalRecords: {
      type: Number,
      default: 0
    },
    currentPage: {
      type: Number,
      default: 1
    },
    itemsPerPage: {
      type: Number,
      default: 20
    }
  },
  emits: ['record-click', 'page-change', 'items-per-page-change'],
  setup(props, { emit }) {
    const rowsPerPageOptions = [10, 20, 50, 100]
    
    // Computed properties for pagination
    const totalPages = computed(() => {
      return Math.ceil(props.totalRecords / props.itemsPerPage)
    })
    
    const paginatedRecords = computed(() => {
      // For server-side pagination, we use all records since they're already paginated
      return props.records
    })
    
    // Computed property to filter out one2many and many2many fields
    const displayableFields = computed(() => {
      return props.fields.filter(field => {
        return field.type !== 'one2many' && field.type !== 'many2many'
      })
    })
    
    // Watch for changes in records to reset pagination
    // Not needed for server-side pagination
    
    // Format field values based on their type and properties
    const formatFieldValue = (value, field) => {
      if (value === null || value === undefined) {
        return ''
      }
      
      // Handle different field types
      switch (field.type) {
        case 'boolean':
          return value ? 'Yes' : 'No'
        case 'date':
          return value ? new Date(value).toLocaleDateString() : ''
        case 'datetime':
          return value ? new Date(value).toLocaleString() : ''
        case 'monetary':
          // Handle monetary fields with currency
          if (field.currency_field) {
            // Currency field information would need to be passed in or retrieved separately
            return value.toString()
          }
          return value.toString()
        case 'float':
        case 'integer':
          // Handle number formatting
          if (field.digits) {
            // field.digits is [total_digits, decimal_places]
            return parseFloat(value).toFixed(field.digits[1] || 0)
          }
          return value.toString()
        case 'many2one':
          // Handle many2one fields (could be [id, name] format or object with display_name)
          if (Array.isArray(value) && value.length >= 2) {
            return value[1] // Return the display name
          } else if (value && typeof value === 'object' && value.display_name) {
            return value.display_name // Return the display_name property
          } else if (value && typeof value === 'object' && value.name) {
            return value.name // Fallback to name property
          }
          return value ? value.toString() : ''
        case 'many2many':
        case 'one2many':
          // Handle relational fields
          if (Array.isArray(value)) {
            return `(${value.length} records)`
          }
          return value.toString()
        case 'selection':
          // Handle selection fields
          if (field.selection) {
            const selection = field.selection.find(item => item[0] === value)
            return selection ? selection[1] : value
          }
          return value.toString()
        default:
          return value.toString()
      }
    }
    
    // Handle row click
    const onRowClick = (record) => {
      emit('record-click', record)
    }
    
    // Edit record
    const editRecord = (record) => {
      console.log('Editing record:', record)
      // Implementation for editing a record
    }
    
    // Delete record
    const deleteRecord = (record) => {
      console.log('Deleting record:', record)
      // Implementation for deleting a record
      if (confirm(`Are you sure you want to delete record ${record.id}?`)) {
        // Perform delete operation
      }
    }
    
    // Pagination functions
    const firstPage = () => {
      if (props.currentPage > 1) {
        emit('page-change', 1)
      }
    }
    
    const prevPage = () => {
      if (props.currentPage > 1) {
        emit('page-change', props.currentPage - 1)
      }
    }
    
    const nextPage = () => {
      if (props.currentPage < totalPages.value) {
        emit('page-change', props.currentPage + 1)
      }
    }
    
    const lastPage = () => {
      if (props.currentPage < totalPages.value) {
        emit('page-change', totalPages.value)
      }
    }
    
    const onRowsPerPageChange = (event) => {
      const newItemsPerPage = parseInt(event.target.value)
      emit('items-per-page-change', newItemsPerPage)
    }
    
    return {
      rowsPerPageOptions,
      totalPages,
      paginatedRecords,
      displayableFields,
      formatFieldValue,
      onRowClick,
      editRecord,
      deleteRecord,
      firstPage,
      prevPage,
      nextPage,
      lastPage,
      onRowsPerPageChange
    }
  }
}
</script>

<style scoped>
.list-view {
  padding: 20px;
}

.loading,
.no-records {
  padding: 40px;
  text-align: center;
  color: #6c757d;
}

.table-container {
  overflow-x: auto;
}

.list-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.table-header {
  padding: 12px 15px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}

.table-row {
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: #f9fafb;
}

.table-cell {
  padding: 12px 15px;
  color: #374151;
}

.actions-header {
  padding: 12px 15px;
  text-align: right;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}

.actions-cell {
  padding: 12px 15px;
  text-align: right;
}

.action-button {
  padding: 4px 8px;
  margin-left: 5px;
  background-color: #f9fafb;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.action-button:hover {
  background-color: #f3f4f6;
}

.action-button.delete {
  background-color: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
}

.action-button.delete:hover {
  background-color: #fecaca;
}

.pagination {
  margin-top: 20px;
  padding: 15px;
  border-top: 1px solid #e5e7eb;
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.rows-per-page {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rows-per-page label {
  font-weight: 500;
  color: #374151;
}

.rows-per-page select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
  cursor: pointer;
}

.rows-per-page select:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.page-navigation {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-info {
  font-weight: 500;
  color: #374151;
}

.page-info-detail {
  font-size: 0.9rem;
  color: #6c757d;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  padding: 6px 12px;
}

/* Responsive design */
@media (max-width: 768px) {
  .pagination-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .page-navigation {
    justify-content: center;
  }
  
  .rows-per-page {
    justify-content: center;
  }
  
  .page-info-detail {
    text-align: center;
  }
}
</style>