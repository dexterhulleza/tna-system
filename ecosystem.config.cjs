/**
 * PM2 Ecosystem Configuration — TNA System
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs        # Start
 *   pm2 reload tna-system                  # Zero-downtime reload after update
 *   pm2 stop tna-system                    # Stop
 *   pm2 logs tna-system                    # View logs
 *   pm2 monit                              # Live monitoring
 */
module.exports = {
  apps: [
    {
      name: "tna-system",
      script: "dist/index.js",
      cwd: __dirname,

      // Environment
      node_args: "--max-old-space-size=512",
      env: {
        NODE_ENV: "production",
      },

      // Process management
      instances: 1,           // Use "max" for cluster mode on multi-core VPS
      exec_mode: "fork",      // Use "cluster" for multi-core
      autorestart: true,
      watch: false,           // Never watch files in production
      max_memory_restart: "400M",

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
