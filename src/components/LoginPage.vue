<template>
  <div class="login-container">
    <div class="login-form">
      <div class="app-logo">
        <h1>Odoo Client</h1>
      </div>
      <h2>Sign in to Odoo</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="serverUrl">Odoo Server URL</label>
          <input 
            type="text" 
            id="serverUrl" 
            v-model="serverUrl" 
            required 
            placeholder="http://localhost:18000"
          />
        </div>
        <div class="form-group">
          <label for="database">Database</label>
          <input 
            type="text" 
            id="database" 
            v-model="database" 
            required 
            placeholder="Enter database name"
          />
        </div>
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            required 
            placeholder="Enter your username"
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required 
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" class="login-button">Sign In</button>
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="info" class="info-message">{{ info }}</div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'LoginPage',
  setup() {
    const serverUrl = ref('http://localhost:18000')
    const database = ref('')
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const info = ref('')
    const router = useRouter()

    const fetchUserMenus = async (userId) => {
      try {
        // Fetch user menus using JSON-RPC
        const menuRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              database.value,
              userId,
              password.value,
              'ir.ui.menu',
              'load_menus',
              [false],  // debug parameter
              {}        // context
            ]
          },
          id: 2
        }

        // Log the request
        console.log('Menu Request:', menuRequest)

        const response = await axios.post('/jsonrpc', menuRequest)
        
        // Log the response
        console.log('Menu Response:', response)
        
        if (response.data.result) {
          return response.data.result
        }
      } catch (err) {
        console.error('Error fetching menus:', err)
        // We'll return an empty object if menus can't be fetched
        return {}
      }
    }

    const handleLogin = async () => {
      // Reset messages
      error.value = ''
      info.value = 'Authenticating...'
      
      // Validate inputs
      if (!serverUrl.value || !database.value || !username.value || !password.value) {
        error.value = 'Please fill in all fields'
        info.value = ''
        return
      }
      
      try {
        // Create the JSON-RPC request for Odoo authentication
        const authRequest = {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'common',
            method: 'authenticate',
            args: [database.value, username.value, password.value, {}]
          },
          id: 1
        }
        
        // Log the request
        console.log('Authentication Request:', authRequest)
        
        // Make the authentication request through the proxy
        const response = await axios.post('/jsonrpc', authRequest)
        
        // Log the response
        console.log('Authentication Response:', response)
        
        // Check if authentication was successful
        if (response.data.result) {
          const userId = response.data.result
          console.log('Authentication successful, user ID:', userId)
          
          // Fetch user menus
          info.value = 'Fetching menus...'
          const menus = await fetchUserMenus(userId)
          console.log('Menus fetched:', menus)
          
          // Store authentication data in localStorage
          localStorage.setItem('isLoggedIn', true)
          localStorage.setItem('odooServerUrl', serverUrl.value)
          localStorage.setItem('odooDatabase', database.value)
          localStorage.setItem('odooUserId', userId)
          localStorage.setItem('odooUsername', username.value)
          localStorage.setItem('odooPassword', password.value) // Store password for subsequent requests
          localStorage.setItem('odooMenus', JSON.stringify(menus))
          
          info.value = 'Authentication successful! Redirecting...'
          
          // Redirect to menu page after a short delay
          setTimeout(() => {
            router.push('/menu')
          }, 1000)
        } else {
          error.value = 'Invalid credentials. Please check your database, username, and password.'
          info.value = ''
        }
      } catch (err) {
        console.error('Authentication error:', err)
        info.value = ''
        if (err.response) {
          // Server responded with error status
          error.value = `Server error: ${err.response.status} - ${err.response.statusText}`
        } else if (err.request) {
          // Request was made but no response received
          error.value = 'Network error. Please check your server URL and connection.'
        } else {
          // Something else happened
          error.value = 'An error occurred during authentication. Please try again.'
        }
      }
    }

    return {
      serverUrl,
      database,
      username,
      password,
      error,
      info,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-form {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 450px;
  text-align: center;
}

.login-form h2 {
  margin-top: 0;
  margin-bottom: 2rem;
  color: #333;
  font-size: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.9rem 1.2rem;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.form-group input:focus {
  border-color: #409eff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.login-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.login-button:active {
  transform: translateY(0);
}

.error-message {
  color: #f56c6c;
  background-color: #fef0f0;
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 1.5rem;
  border: 1px solid #fbc4c4;
}

.info-message {
  color: #409eff;
  background-color: #ecf5ff;
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 1.5rem;
  border: 1px solid #b3d9ff;
}

.app-logo {
  margin-bottom: 1.5rem;
}

.app-logo h1 {
  color: #333;
  font-size: 2.5rem;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>