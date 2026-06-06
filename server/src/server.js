require('dotenv').config();
const app = require('./app');
const { config } = require('./config/env');

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(`\n🧠 RecruitIQ API Server`);
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   Port:        ${PORT}`);
  console.log(`   API:         http://localhost:${PORT}/api/v1`);
  console.log(`   Health:      http://localhost:${PORT}/api/v1/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
