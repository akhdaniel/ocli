<template>
  <div class="menu-container">
    <!-- Top Navigation Bar -->
    <nav class="top-nav">
      <div class="nav-left">
        <div class="nav-brand" @click="goToMenuPage">
          <h3>XERPIUM</h3>
        </div>
        <!-- Submenu hierarchy display with popups -->
        <div class="nav-links" v-if="submenuHierarchy.length > 0">
          <template v-for="submenu in submenuHierarchy" :key="submenu.id">
            <div class="nav-dropdown" 
                 v-if="submenu.children && submenu.children.length > 0"
                 @mouseenter="showPopup(submenu)"
                 @mouseleave="hidePopup">
              <a href="#" class="nav-link dropdown-toggle" @click.prevent="togglePopup(submenu)">
                {{ submenu.name }}
              </a>
              <!-- Popup submenu -->
              <div class="popup-menu" v-show="activePopup === submenu.id">
                <template v-for="child in submenu.children" :key="child.id">
                  <a href="#" class="popup-item" @click.prevent="navigateToMenu(child)">
                    {{ child.name }}
                  </a>
                </template>
              </div>
            </div>
            <a href="#" class="nav-link" v-else @click.prevent="navigateToMenu(submenu)">
              {{ submenu.name }}
            </a>
          </template>
        </div>
      </div>
      <div class="nav-right">
        <div class="search-box">
          <input type="text" placeholder="Search..." />
        </div>
        <div class="nav-icons">
          <button class="icon-button">
            <i class="bell-icon">🔔</i>
          </button>
          <button class="icon-button">
            <i class="settings-icon">⚙️</i>
          </button>
        </div>
        <div class="user-profile">
          <div class="user-avatar">{{ userInfo.username.charAt(0).toUpperCase() }}</div>
          <span class="welcome-text">{{ userInfo.username }}</span>
          <button @click="handleLogout" class="logout-button">Logout</button>
        </div>
      </div>
    </nav>
    
    <!-- Main Content Area -->
    <main class="main-content">
      <div class="content-wrapper">
        <div class="page-header">
        </div>
        
        <!-- Breadcrumb navigation -->
        <div class="breadcrumb" v-if="selectedMenu">
          <a href="#" @click.prevent="goToMenuPage">Home</a>
          <span class="breadcrumb-separator">/</span>
          <span>{{ selectedMenu.name }}</span>
        </div>
        
        <!-- Action View -->
        <ActionView 
          v-if="currentAction && currentModelName"
          :model-name="currentModelName"
          :action="currentAction"
          :action-details="currentAction"
        />
        
        <!-- Menu Grid (only shown when no action is selected) -->
        <div class="menu-grid" v-if="!currentAction">
          <div 
            v-for="menu in topLevelMenus" 
            :key="menu.id" 
            class="menu-card"
            @click="navigateToMenu(menu)"
          >
            <div class="menu-icon">
              <!-- More specific icons for common Odoo modules -->
              <span v-if="menu.name.includes('Sales') || menu.name.includes('sale')">💰</span>
              <span v-else-if="menu.name.includes('Purchase') || menu.name.includes('purchase')">🛒</span>
              <span v-else-if="menu.name.includes('Inventory') || menu.name.includes('stock')">📦</span>
              <span v-else-if="menu.name.includes('Accounting') || menu.name.includes('account')">📊</span>
              <span v-else-if="menu.name.includes('HR') || menu.name.includes('human')">👥</span>
              <span v-else-if="menu.name.includes('Project') || menu.name.includes('project')">📋</span>
              <span v-else-if="menu.name.includes('Manufacturing') || menu.name.includes('mrp')">🏭</span>
              <span v-else-if="menu.name.includes('Website') || menu.name.includes('website')">🌐</span>
              <span v-else-if="menu.name.includes('Marketing') || menu.name.includes('marketing')">📣</span>
              <span v-else-if="menu.name.includes('CRM') || menu.name.includes('crm')">💼</span>
              <span v-else-if="menu.name.includes('Point of Sale') || menu.name.includes('pos')">💳</span>
              <span v-else-if="menu.name.includes('Calendar') || menu.name.includes('calendar')">📅</span>
              <span v-else-if="menu.name.includes('Email') || menu.name.includes('mail')">✉️</span>
              <span v-else-if="menu.name.includes('Documents') || menu.name.includes('document')">📁</span>
              <span v-else-if="menu.name.includes('Discuss') || menu.name.includes('discuss')">💬</span>
              <span v-else>📌</span>
            </div>
            <div class="menu-name">{{ menu.name }}</div>
            <div class="menu-description">
              Access and manage {{ menu.name.toLowerCase() }} related data and operations.
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import ActionView from './ActionView.vue'

export default {
  name: 'MenuPage',
  components: {
    ActionView
  },
  setup() {
    const router = useRouter()
    const userInfo = ref({
      username: '',
      database: '',
      serverUrl: ''
    })
    const topLevelMenus = ref([])
    const selectedMenu = ref(null)
    const submenuHierarchy = ref([])
    const activePopup = ref(null)
    const currentAction = ref(null)
    const currentModelName = ref(null)

    // Watch for changes in selected menu
    watch(selectedMenu, (newMenu, oldMenu) => {
      if (newMenu && newMenu !== oldMenu) {
        console.log('Selected menu changed:', newMenu)
        // Clear current action when menu changes
        currentAction.value = null
        currentModelName.value = null
      }
    })

    // Load user info and menus from localStorage on component mount
    onMounted(async () => {
      // Load user info
      userInfo.value.username = localStorage.getItem('odooUsername') || ''
      userInfo.value.database = localStorage.getItem('odooDatabase') || ''
      userInfo.value.serverUrl = localStorage.getItem('odooServerUrl') || ''
      
      // Load menus
      await loadMenus()
    })

    const loadMenus = async () => {
      try {
        // Try to load menus from localStorage first
        const menusData = localStorage.getItem('odooMenus')
        console.log('Menus data from localStorage:', menusData)
        if (menusData) {
          const menus = JSON.parse(menusData)
          console.log('Parsed menus:', menus)
          // Get top-level menus (those without a parent)
          topLevelMenus.value = Object.values(menus).filter(menu => 
            !menu.parent_id || menu.parent_id === false
          ).map(menu => ({
            id: menu.id,
            name: menu.name,
            action: menu.action, // Include the action field
            children: getMenuChildren(menu.id)
          }))
          console.log('Top level menus:', topLevelMenus.value)
        } else {
          // If no menus in localStorage, fetch them from the server
          await fetchMenusFromServer()
        }
      } catch (err) {
        console.error('Error loading menus:', err)
        topLevelMenus.value = []
      }
    }

    const fetchMenusFromServer = async () => {
      try {
        // Fetch menus from the server using /web/webclient/load_menus endpoint
        const menusRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {},
          id: Date.now()
        }
        
        console.log('Menus Load Request:', menusRequest)
        
        const endpointUrl = `/web/webclient/load_menus`
        const response = await axios.post(endpointUrl, menusRequest)
        console.log('Menus Load Response:', response)
        
        if (response.data.result) {
          const menus = response.data.result
          // Store menus in localStorage
          localStorage.setItem('odooMenus', JSON.stringify(menus))
          
          // Get top-level menus (those without a parent)
          topLevelMenus.value = Object.values(menus).filter(menu => 
            !menu.parent_id || menu.parent_id === false
          ).map(menu => ({
            id: menu.id,
            name: menu.name,
            action: menu.action, // Include the action field
            children: getMenuChildren(menu.id)
          }))
          console.log('Top level menus:', topLevelMenus.value)
        }
      } catch (error) {
        console.error('Error fetching menus from server:', error)
        topLevelMenus.value = []
      }
    }

    const navigateToMenu = (menu) => {
      // Set the selected menu
      selectedMenu.value = menu
      
      // Check if this is a lowest level menu (no children)
      const children = getMenuChildren(menu.id)
      const isLowestLevel = children.length === 0
      
      if (isLowestLevel) {
        // This is a lowest level menu, fetch its action
        fetchMenuAction(menu)
      } else {
        // This menu has children, update the submenu hierarchy
        buildSubmenuHierarchy({ ...menu, children })
        // Clear any current action when navigating to a menu with children
        currentAction.value = null
        currentModelName.value = null
      }
      
      // In a real implementation, this would navigate to the specific menu view
      console.log('Navigating to menu:', menu)
    }
    
    const fetchMenuAction = async (menu) => {
      try {
        // Clear current action first to trigger reactivity
        currentAction.value = null
        currentModelName.value = null
        
        // Check if menu has an action
        if (!menu.action) {
          console.log('Menu has no action:', menu)
          return
        }
        
        // Parse the action reference (format: "model_name,id")
        const [actionModel, actionIdStr] = menu.action.split(',')
        const actionId = parseInt(actionIdStr)
        
        console.log('Fetching action:', { actionModel, actionId })
        
        // Fetch action details using /web/action/load endpoint
        const actionRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            action_id: actionId
          },
          id: Date.now()
        }
        
        console.log('Action Load Request:', actionRequest)
        
        const endpointUrl = `/web/action/load`
        const response = await axios.post(endpointUrl, actionRequest)
        console.log('Action Load Response:', response)
        
        if (response.data.result) {
          const action = response.data.result
          console.log('Action details:', action)
          
          // Create a new object to ensure reactivity
          currentAction.value = { ...action }
          
          // Extract model name
          const modelName = action.res_model
          console.log('Model name:', modelName)
          
          // Set the current model name
          currentModelName.value = modelName
        }
      } catch (error) {
        console.error('Error fetching menu action:', error)
      }
    }
    
    const buildSubmenuHierarchy = (menu) => {
      // Update the submenu hierarchy with the children of the selected menu
      submenuHierarchy.value = menu.children || []
      
      console.log('Submenu hierarchy updated:', submenuHierarchy.value)
    }
    
    // Function to get all menus from localStorage for navigation
    const getAllMenus = () => {
      try {
        const menusData = localStorage.getItem('odooMenus')
        if (menusData) {
          return JSON.parse(menusData)
        }
      } catch (err) {
        console.error('Error loading menus:', err)
      }
      return {}
    }
    
    // Function to get children of a menu item
    const getMenuChildren = (parentId) => {
      const allMenus = getAllMenus()
      const children = []
      
      for (const menuId in allMenus) {
        const menu = allMenus[menuId]
        // Check if parent_id is an array and the first element matches parentId
        if (menu.parent_id && Array.isArray(menu.parent_id) && menu.parent_id[0] === parentId) {
          children.push({
            id: menu.id,
            name: menu.name,
            action: menu.action, // Include the action field
            children: getMenuChildren(menu.id)
          })
        }
      }
      
      return children
    }

    const handleLogout = () => {
      // Remove all authentication data from localStorage
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('odooServerUrl')
      localStorage.removeItem('odooDatabase')
      localStorage.removeItem('odooUserId')
      localStorage.removeItem('odooUsername')
      localStorage.removeItem('odooPassword')
      localStorage.removeItem('odooMenus')
      
      // Redirect to login page
      router.push('/')
    }

    const goToMenuPage = () => {
      // Already on the menu page, so just scroll to top
      window.scrollTo(0, 0)
    }

    const togglePopup = (menu) => {
      // If the same menu is clicked, close the popup
      if (activePopup.value === menu.id) {
        activePopup.value = null
      } else {
        // Open the popup for this menu
        activePopup.value = menu.id
      }
    }
    
    const showPopup = (menu) => {
      activePopup.value = menu.id
    }
    
    const hidePopup = () => {
      activePopup.value = null
    }
    
    // Close popup when clicking outside
    const handleClickOutside = (event) => {
      if (activePopup.value && !event.target.closest('.nav-dropdown')) {
        activePopup.value = null
      }
    }
    
    // Add event listener for clicking outside
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })
    
    // Remove event listener when component is unmounted
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      userInfo,
      topLevelMenus,
      selectedMenu,
      submenuHierarchy,
      activePopup,
      currentAction,
      currentModelName,
      navigateToMenu,
      handleLogout,
      goToMenuPage,
      togglePopup,
      showPopup,
      hidePopup
    }
  }
}
</script>

<style scoped>
.menu-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Top Navigation Bar */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  color: #333;
  padding: 0 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid #eef1f6;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-brand {
  cursor: pointer;
}

.nav-brand h3 {
  margin: 0;
  color: #212529;
  font-size: 1.4rem;
  font-weight: 600;
}

.nav-links {
  display: flex;
  gap: 1.8rem;
}

.nav-link {
  text-decoration: none;
  color: #6c757d;
  font-weight: 500;
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.2s;
  font-size: 0.95rem;
}

.nav-link:hover {
  color: #409eff;
}

.nav-link.active {
  color: #409eff;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #409eff;
  border-radius: 1px;
}

/* Dropdown Menu Styles */
.nav-dropdown {
  position: relative;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
}

.dropdown-toggle::after {
  content: "▼";
  font-size: 0.6rem;
  margin-left: 0.5rem;
  transition: transform 0.2s;
}

.nav-dropdown:hover .dropdown-toggle::after {
  transform: rotate(180deg);
}

/* Popup Menu Styles */
.popup-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  min-width: 200px;
  z-index: 1000;
  border: 1px solid #eef1f6;
}

.popup-item {
  display: block;
  padding: 0.75rem 1rem;
  color: #333;
  text-decoration: none;
  transition: background-color 0.2s;
  font-size: 0.9rem;
}

.popup-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.search-box input {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 0.9rem;
  width: 200px;
}

.search-box input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.nav-icons {
  display: flex;
  gap: 1rem;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  color: #666;
  padding: 0.5rem;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button:hover {
  background-color: #f5f5f5;
  color: #409eff;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.welcome-text {
  font-weight: 500;
  color: #333;
}

.logout-button {
  background-color: #f56c6c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background-color: #e65151;
}

/* Main Content Area */
.main-content {
  flex: 1;
  background-color: #f5f7fa;
  overflow-y: auto;
  padding: 1.5rem;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* Breadcrumb */
.breadcrumb {
  padding: 1rem 0;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.breadcrumb a {
  color: #409eff;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  margin: 0 0.5rem;
  color: #999;
}

/* Menu Grid */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.2rem;
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.2rem;
}

.menu-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.8rem 1.2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid #eef1f6;
  position: relative;
  overflow: hidden;
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.menu-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #72c0ff);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.menu-card:hover::before {
  transform: scaleX(1);
}

.menu-icon {
  font-size: 2.2rem;
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
}

.menu-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.6rem;
  letter-spacing: 0.3px;
}

.menu-description {
  font-size: 0.85rem;
  color: #6c757d;
  line-height: 1.5;
  margin-bottom: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .top-nav {
    flex-direction: column;
    height: auto;
    padding: 1rem;
  }
  
  .nav-left, .nav-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .search-box input {
    width: 150px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .menu-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>