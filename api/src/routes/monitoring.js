const express = require('express');
const router = express.Router();

/**
 * Get system statistics
 * GET /api/monitoring/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      transactions: {
        total: Math.floor(Math.random() * 100000),
        flagged: Math.floor(Math.random() * 5000),
        blocked: Math.floor(Math.random() * 500),
        last24h: Math.floor(Math.random() * 10000)
      },
      wallets: {
        total: Math.floor(Math.random() * 50000),
        highRisk: Math.floor(Math.random() * 1000),
        sanctioned: Math.floor(Math.random() * 50),
        monitored: Math.floor(Math.random() * 5000)
      },
      alerts: {
        active: Math.floor(Math.random() * 100),
        resolved: Math.floor(Math.random() * 1000),
        critical: Math.floor(Math.random() * 10),
        last24h: Math.floor(Math.random() * 200)
      },
      models: {
        patternAnalyzer: {
          status: 'active',
          accuracy: 0.94,
          lastUpdate: new Date(Date.now() - 86400000).toISOString()
        },
        gnn: {
          status: 'active',
          accuracy: 0.92,
          lastUpdate: new Date(Date.now() - 86400000).toISOString()
        },
        riskScorer: {
          status: 'active',
          accuracy: 0.95,
          lastUpdate: new Date(Date.now() - 86400000).toISOString()
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

/**
 * Get active alerts
 * GET /api/monitoring/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { status, severity, limit = 50 } = req.query;

    // Mock alerts data
    const alerts = generateMockAlerts(parseInt(limit));

    // Filter by status
    let filteredAlerts = alerts;
    if (status) {
      filteredAlerts = filteredAlerts.filter(a => a.status === status);
    }

    // Filter by severity
    if (severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
    }

    res.json({
      total: filteredAlerts.length,
      alerts: filteredAlerts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      message: error.message
    });
  }
});

/**
 * Get transaction monitoring data
 * GET /api/monitoring/transactions
 */
router.get('/transactions', async (req, res) => {
  try {
    const { period = '24h', flagged = false } = req.query;

    const data = {
      period,
      transactions: generateMockTransactions(100, flagged === 'true'),
      summary: {
        total: 1234,
        flagged: 56,
        blocked: 12,
        avgRiskScore: 32.5
      },
      timestamp: new Date().toISOString()
    };

    res.json(data);
  } catch (error) {
    console.error('Transactions monitoring error:', error);
    res.status(500).json({
      error: 'Failed to get transaction data',
      message: error.message
    });
  }
});

/**
 * Get risk metrics over time
 * GET /api/monitoring/risk-trends
 */
router.get('/risk-trends', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const trends = [];
    const now = Date.now();

    for (let i = parseInt(days); i >= 0; i--) {
      trends.push({
        date: new Date(now - i * 86400000).toISOString().split('T')[0],
        avgRiskScore: Math.random() * 50 + 20,
        flaggedTransactions: Math.floor(Math.random() * 100) + 50,
        highRiskWallets: Math.floor(Math.random() * 50) + 10,
        alerts: Math.floor(Math.random() * 30) + 5
      });
    }

    res.json({
      period: `${days} days`,
      trends,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Risk trends error:', error);
    res.status(500).json({
      error: 'Failed to get risk trends',
      message: error.message
    });
  }
});

/**
 * Get model performance metrics
 * GET /api/monitoring/models
 */
router.get('/models', async (req, res) => {
  try {
    const metrics = {
      patternAnalyzer: {
        accuracy: 0.943,
        precision: 0.921,
        recall: 0.956,
        f1Score: 0.938,
        inferenceTime: 45, // ms
        predictions: 15234,
        errors: 0,
        status: 'healthy',
        lastUpdate: new Date(Date.now() - 3600000).toISOString()
      },
      walletGNN: {
        accuracy: 0.918,
        precision: 0.905,
        recall: 0.931,
        f1Score: 0.918,
        inferenceTime: 120, // ms
        predictions: 8421,
        errors: 0,
        status: 'healthy',
        lastUpdate: new Date(Date.now() - 3600000).toISOString()
      },
      riskScorer: {
        accuracy: 0.952,
        precision: 0.947,
        recall: 0.958,
        f1Score: 0.952,
        inferenceTime: 65, // ms
        predictions: 23456,
        errors: 0,
        status: 'healthy',
        lastUpdate: new Date(Date.now() - 3600000).toISOString()
      },
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    console.error('Model metrics error:', error);
    res.status(500).json({
      error: 'Failed to get model metrics',
      message: error.message
    });
  }
});

// Helper functions
function generateMockAlerts(count) {
  const alerts = [];
  const severities = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const patterns = ['STRUCTURING', 'RAPID_MOVEMENT', 'MIXING', 'HIGH_VOLUME', 'SANCTION_INTERACTION'];
  const statuses = ['active', 'investigating', 'resolved'];

  for (let i = 0; i < count; i++) {
    alerts.push({
      id: `alert_${i}`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      pattern: patterns[Math.floor(Math.random() * patterns.length)],
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      description: 'Suspicious activity detected',
      anomalyScore: Math.floor(Math.random() * 100),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
    });
  }

  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function generateMockTransactions(count, flaggedOnly = false) {
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const flagged = flaggedOnly || Math.random() < 0.1;

    transactions.push({
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: `0x${Math.random().toString(16).substr(2, 40)}`,
      to: `0x${Math.random().toString(16).substr(2, 40)}`,
      amount: Math.random() * 1000,
      riskScore: flagged ? Math.random() * 50 + 50 : Math.random() * 50,
      flagged,
      pattern: flagged ? 'SUSPICIOUS' : 'NORMAL',
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
    });
  }

  return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = router;
