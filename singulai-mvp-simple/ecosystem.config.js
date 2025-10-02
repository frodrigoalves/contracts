module.exports = {
  apps: [{
    name: 'singulai-mvp',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DOMAIN: 'singulai.site'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }],

  deploy: {
    production: {
      user: 'root',
      host: 'srv993737.hostinger.com',
      ref: 'origin/main',
      repo: 'git@github.com:singulai/mvp.git',
      path: '/opt/singulai-mvp',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};