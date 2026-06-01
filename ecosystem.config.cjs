module.exports = {
  apps: [
    {
      name: 'agenticstack',
      script: 'dist/server.cjs',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      instances: 'max',
      exec_mode: 'cluster'
    }
  ]
}
