<template>
  <div class="list-view">
    <div v-if="loading" class="loading">
      <p>Loading records...</p>
    </div>
    
    <div v-else-if="records.length === 0" class="no-records">
      <p>No records found</p>
    </div>
    
    <div v-else class="table-container">
      <table class="list-table">
        <thead>
          <tr>
            <th 
              v-for="field in fields" 
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
            v-for="record in records" 
            :key="record.id"
            class="table-row"
            @click="onRowClick(record)"
          >
            <td 
              v-for="field in fields" 
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
    
    <div class="pagination" v-if="records.length > 0">
      <button class="btn btn-outline" :disabled="currentPage === 1" @click="prevPage">Previous</button>
      <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
      <button class="btn btn-outline" :disabled="currentPage === totalPages" @click="nextPage">Next</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

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
    }
  },
  emits: ['record-click'],
  setup(props, { emit }) {
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    
    // Computed properties for pagination
    const totalPages = computed(() => {
      return Math.ceil(props.records.length / itemsPerPage.value)
    })
    
    const paginatedRecords = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return props.records.slice(start, end)
    })
    
    // Watch for changes in records to reset pagination
    watch(() => props.records, () => {
      currentPage.value = 1
    })
    
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
          // Handle many2one fields (usually [id, name] format)
          if (Array.isArray(value) && value.length >= 2) {
            return value[1] // Return the display name
          }
          return value.toString()
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
    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }
    
    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }
    
    return {
      currentPage,
      itemsPerPage,
      totalPages,
      paginatedRecords,
      formatFieldValue,
      onRowClick,
      editRecord,
      deleteRecord,
      prevPage,
      nextPage
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
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 15px;
}

.page-info {
  font-weight: 500;
  color: #374151;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  padding: 6px 12px;
}
</style>