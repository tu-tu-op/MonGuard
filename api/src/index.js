const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const oracleRoutes = require('./routes/oracle');
const analysisRoutes = require('./routes/analysis');
const monitoringRoutes = require('./routes/monitoring');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/api/oracle', oracleRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MonGuard API',
    version: '1.0.0',
    description: 'AI-Powered On-Chain Compliance & AML Analytics',
    endpoints: {
      oracle: '/api/oracle',
      analysis: '/api/analysis',
      monitoring: '/api/monitoring',
      health: '/health'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('MonGuard API Server');
  console.log('='.repeat(60));
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
});

module.exports = app;
