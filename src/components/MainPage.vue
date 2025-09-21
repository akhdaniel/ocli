<template>
  <div class="main-container">
    <!-- Top Navigation Bar -->
    <nav class="top-nav">
      <div class="nav-left">
        <div class="nav-brand" @click="goToMenuPage">
          <h3>Odoo Client</h3>
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
          <h1>Odoo Dashboard</h1>
          <div class="header-actions">
            <button class="btn btn-primary" @click="goToMenuPage">View All Apps</button>
            <button class="btn btn-secondary">Export</button>
          </div>
        </div>
        
        <!-- Server Info Card -->
        <div class="server-info-card card">
          <div class="card-header">
            <h3>Connection Information</h3>
          </div>
          <div class="card-content">
            <div class="info-row">
              <span class="info-label">Server:</span>
              <span class="info-value">{{ userInfo.serverUrl }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Database:</span>
              <span class="info-value">{{ userInfo.database }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Username:</span>
              <span class="info-value">{{ userInfo.username }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Odoo Version:</span>
              <span class="info-value">{{ serverInfo.version || 'Loading...' }}</span>
            </div>
          </div>
        </div>
        
        <div class="stats-container">
          <div class="stat-card">
            <div class="stat-value">12</div>
            <div class="stat-label">Projects</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">8</div>
            <div class="stat-label">Teams</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">24</div>
            <div class="stat-label">Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">92%</div>
            <div class="stat-label">Completion</div>
          </div>
        </div>
        
        <div class="content-grid">
          <div class="card recent-activity">
            <div class="card-header">
              <h3>Recent Activity</h3>
            </div>
            <div class="card-content">
              <ul class="activity-list">
                <li class="activity-item">
                  <div class="activity-icon">📝</div>
                  <div class="activity-details">
                    <div class="activity-title">Project "Website Redesign" created</div>
                    <div class="activity-time">2 hours ago</div>
                  </div>
                </li>
                <li class="activity-item">
                  <div class="activity-icon">👥</div>
                  <div class="activity-details">
                    <div class="activity-title">New team member added</div>
                    <div class="activity-time">5 hours ago</div>
                  </div>
                </li>
                <li class="activity-item">
                  <div class="activity-icon">✅</div>
                  <div class="activity-details">
                    <div class="activity-title">Task "API Integration" completed</div>
                    <div class="activity-time">1 day ago</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          <div class="card project-list">
            <div class="card-header">
              <h3>Projects</h3>
            </div>
            <div class="card-content">
              <div class="project-item">
                <div class="project-info">
                  <h4>Website Redesign</h4>
                  <p>Complete overhaul of company website</p>
                </div>
                <div class="project-status">
                  <span class="status-badge status-in-progress">In Progress</span>
                </div>
              </div>
              <div class="project-item">
                <div class="project-info">
                  <h4>Mobile App</h4>
                  <p>Development of new mobile application</p>
                </div>
                <div class="project-status">
                  <span class="status-badge status-planning">Planning</span>
                </div>
              </div>
              <div class="project-item">
                <div class="project-info">
                  <h4>API Integration</h4>
                  <p>Integration with third-party services</p>
                </div>
                <div class="project-status">
                  <span class="status-badge status-completed">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'MainPage',
  setup() {
    const router = useRouter()
    const userInfo = ref({
      username: '',
      database: '',
      serverUrl: ''
    })
    const serverInfo = ref({
      version: '',
      database: ''
    })

    // Load user info from localStorage on component mount
    onMounted(() => {
      userInfo.value.username = localStorage.getItem('odooUsername') || ''
      userInfo.value.database = localStorage.getItem('odooDatabase') || ''
      userInfo.value.serverUrl = localStorage.getItem('odooServerUrl') || ''
      
      // Fetch server information
      fetchServerInfo()
    })

    const fetchServerInfo = async () => {
      try {
        const serverUrl = localStorage.getItem('odooServerUrl')
        const database = localStorage.getItem('odooDatabase')
        
        if (!serverUrl || !database) return
        
        // Fetch server version info through proxy
        const versionRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'common',
            method: 'version',
            args: []
          },
          id: 1
        }
        
        // Log the request
        console.log('Server Info Request:', versionRequest)
        
        const response = await axios.post('/jsonrpc', versionRequest)
        
        // Log the response
        console.log('Server Info Response:', response)
        
        if (response.data.result) {
          serverInfo.value.version = response.data.result.server_version || 'Unknown'
          serverInfo.value.database = database
        }
      } catch (err) {
        console.error('Error fetching server info:', err)
        // We'll just use default values
      }
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
      router.push('/menu')
    }

    return {
      userInfo,
      serverInfo,
      handleLogout,
      goToMenuPage
    }
  }
}
</script>

<style scoped>
.main-container {
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
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
  color: #409eff;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
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

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 1000;
  display: none;
}

.nav-dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-item {
  display: block;
  padding: 0.5rem 1rem;
  color: #333;
  text-decoration: none;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f5f7fa;
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  color: #333;
  font-size: 1.8rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
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
  background-color: #ffffff;
  color: #666;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background-color: #f5f5f5;
}

/* Statistics Cards */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 1rem;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #eee;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.card-content {
  padding: 1.5rem;
}

/* Server Info Card */
.server-info-card {
  margin-bottom: 2rem;
}

.info-row {
  display: flex;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: #333;
  width: 120px;
  flex-shrink: 0;
}

.info-value {
  color: #666;
  flex: 1;
}
</style>