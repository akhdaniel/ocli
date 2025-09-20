const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/web': {
        target: 'http://localhost:18000',
        changeOrigin: true,
        secure: false
      },
      '/jsonrpc': {
        target: 'http://localhost:18000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
