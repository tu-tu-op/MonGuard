const request = require('supertest');
const app = require('../index');

describe('MonGuard API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('Oracle Endpoints', () => {
    it('should check address sanctions', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      const res = await request(app)
        .get(`/api/oracle/check/${testAddress}`)
        .expect(200);

      expect(res.body).toHaveProperty('address', testAddress);
      expect(res.body).toHaveProperty('sanctioned');
      expect(res.body).toHaveProperty('sources');
      expect(res.body.sources).toHaveProperty('ofac');
      expect(res.body.sources).toHaveProperty('fatf');
    });

    it('should reject invalid address format', async () => {
      const res = await request(app)
        .get('/api/oracle/check/invalid')
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should perform batch sanctions check', async () => {
      const addresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        '0x123d35Cc6634C0532925a3b844Bc9e7595f0abc'
      ];

      const res = await request(app)
        .post('/api/oracle/batch-check')
        .send({ addresses })
        .expect(200);

      expect(res.body).toHaveProperty('total', addresses.length);
      expect(res.body).toHaveProperty('results');
      expect(res.body.results).toHaveLength(addresses.length);
    });

    it('should limit batch size', async () => {
      const addresses = new Array(150).fill('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');

      const res = await request(app)
        .post('/api/oracle/batch-check')
        .send({ addresses })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Maximum');
    });
  });

  describe('Analysis Endpoints', () => {
    it('should analyze wallet risk', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      const res = await request(app)
        .get(`/api/analysis/wallet/${testAddress}`)
        .expect(200);

      expect(res.body).toHaveProperty('address', testAddress);
      expect(res.body).toHaveProperty('riskScore');
      expect(res.body).toHaveProperty('riskLevel');
      expect(res.body).toHaveProperty('patterns');
      expect(res.body).toHaveProperty('communityType');
    });

    it('should analyze transaction patterns', async () => {
      const transactions = [
        { from: '0x123...', to: '0x456...', amount: 100, timestamp: Date.now() },
        { from: '0x123...', to: '0x789...', amount: 150, timestamp: Date.now() }
      ];

      const res = await request(app)
        .post('/api/analysis/pattern')
        .send({ transactions })
        .expect(200);

      expect(res.body).toHaveProperty('patternType');
      expect(res.body).toHaveProperty('confidence');
      expect(res.body).toHaveProperty('anomalyScore');
      expect(res.body).toHaveProperty('suspicious');
    });

    it('should calculate transaction risk score', async () => {
      const res = await request(app)
        .post('/api/analysis/score')
        .send({
          from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          to: '0x123d35Cc6634C0532925a3b844Bc9e7595f0abc',
          amount: 1000
        })
        .expect(200);

      expect(res.body).toHaveProperty('overall');
      expect(res.body).toHaveProperty('components');
      expect(res.body).toHaveProperty('recommendation');
      expect(res.body).toHaveProperty('shouldBlock');
      expect(res.body).toHaveProperty('requiresReview');
    });

    it('should require all fields for risk scoring', async () => {
      const res = await request(app)
        .post('/api/analysis/score')
        .send({ from: '0x123...', to: '0x456...' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('required');
    });
  });

  describe('Monitoring Endpoints', () => {
    it('should return system statistics', async () => {
      const res = await request(app)
        .get('/api/monitoring/stats')
        .expect(200);

      expect(res.body).toHaveProperty('transactions');
      expect(res.body).toHaveProperty('wallets');
      expect(res.body).toHaveProperty('alerts');
      expect(res.body).toHaveProperty('models');

      expect(res.body.transactions).toHaveProperty('total');
      expect(res.body.transactions).toHaveProperty('flagged');
      expect(res.body.models).toHaveProperty('patternAnalyzer');
    });

    it('should return active alerts', async () => {
      const res = await request(app)
        .get('/api/monitoring/alerts')
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('alerts');
      expect(Array.isArray(res.body.alerts)).toBe(true);
    });

    it('should filter alerts by severity', async () => {
      const res = await request(app)
        .get('/api/monitoring/alerts?severity=CRITICAL')
        .expect(200);

      expect(res.body).toHaveProperty('alerts');
      res.body.alerts.forEach(alert => {
        expect(alert.severity).toBe('CRITICAL');
      });
    });

    it('should return risk trends', async () => {
      const res = await request(app)
        .get('/api/monitoring/risk-trends?days=7')
        .expect(200);

      expect(res.body).toHaveProperty('period', '7 days');
      expect(res.body).toHaveProperty('trends');
      expect(Array.isArray(res.body.trends)).toBe(true);
      expect(res.body.trends.length).toBeGreaterThan(0);
    });

    it('should return model performance metrics', async () => {
      const res = await request(app)
        .get('/api/monitoring/models')
        .expect(200);

      expect(res.body).toHaveProperty('patternAnalyzer');
      expect(res.body).toHaveProperty('walletGNN');
      expect(res.body).toHaveProperty('riskScorer');

      expect(res.body.patternAnalyzer).toHaveProperty('accuracy');
      expect(res.body.patternAnalyzer).toHaveProperty('precision');
      expect(res.body.patternAnalyzer).toHaveProperty('recall');
      expect(res.body.patternAnalyzer).toHaveProperty('status');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make many requests quickly
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app).get('/api/monitoring/stats')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const res = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/analysis/pattern')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });
});
