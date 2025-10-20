const express = require('express');
const router = express.Router();
const axios = require('axios');

// Mock OFAC/FATF API endpoints (replace with real endpoints in production)
const OFAC_API_URL = process.env.OFAC_API_URL || 'https://api.ofac.treasury.gov';
const FATF_API_URL = process.env.FATF_API_URL || 'https://api.fatf-gafi.org';

/**
 * Check if an address is sanctioned
 * GET /api/oracle/check/:address
 */
router.get('/check/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid address format'
      });
    }

    // Check OFAC sanctions list
    const ofacResult = await checkOFAC(address);

    // Check FATF list
    const fatfResult = await checkFATF(address);

    // Check internal database
    const internalResult = await checkInternalDB(address);

    const isSanctioned = ofacResult.sanctioned || fatfResult.sanctioned || internalResult.sanctioned;

    res.json({
      address,
      sanctioned: isSanctioned,
      sources: {
        ofac: ofacResult,
        fatf: fatfResult,
        internal: internalResult
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Oracle check error:', error);
    res.status(500).json({
      error: 'Failed to check sanctions',
      message: error.message
    });
  }
});

/**
 * Get compliance data for an address
 * GET /api/oracle/compliance/:address
 */
router.get('/compliance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid address format'
      });
    }

    // Fetch comprehensive compliance data
    const complianceData = {
      address,
      sanctioned: false,
      isPEP: false,
      jurisdiction: 'UNKNOWN',
      riskLevel: 'LOW',
      sources: [],
      lastChecked: new Date().toISOString()
    };

    // In production, query real APIs
    // For now, return mock data
    res.json(complianceData);
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({
      error: 'Failed to get compliance data',
      message: error.message
    });
  }
});

/**
 * Batch check multiple addresses
 * POST /api/oracle/batch-check
 */
router.post('/batch-check', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({
        error: 'Invalid addresses array'
      });
    }

    if (addresses.length > 100) {
      return res.status(400).json({
        error: 'Maximum 100 addresses per batch'
      });
    }

    // Check all addresses
    const results = await Promise.all(
      addresses.map(async (address) => {
        try {
          const ofacResult = await checkOFAC(address);
          const fatfResult = await checkFATF(address);

          return {
            address,
            sanctioned: ofacResult.sanctioned || fatfResult.sanctioned,
            sources: {
              ofac: ofacResult,
              fatf: fatfResult
            }
          };
        } catch (error) {
          return {
            address,
            error: error.message
          };
        }
      })
    );

    res.json({
      total: addresses.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch check error:', error);
    res.status(500).json({
      error: 'Failed to batch check',
      message: error.message
    });
  }
});

/**
 * Update sanctions list (admin only)
 * POST /api/oracle/update-sanctions
 */
router.post('/update-sanctions', async (req, res) => {
  try {
    // In production, add authentication/authorization here
    const apiKey = req.headers['x-api-key'];

    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch latest sanctions lists
    console.log('Updating sanctions lists...');

    // Mock update - in production, fetch from real sources
    const updateResults = {
      ofac: {
        updated: true,
        count: 1250,
        timestamp: new Date().toISOString()
      },
      fatf: {
        updated: true,
        count: 850,
        timestamp: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      results: updateResults,
      message: 'Sanctions lists updated successfully'
    });
  } catch (error) {
    console.error('Update sanctions error:', error);
    res.status(500).json({
      error: 'Failed to update sanctions',
      message: error.message
    });
  }
});

// Helper functions

async function checkOFAC(address) {
  // Mock implementation - replace with real OFAC API call
  // In production, call actual OFAC API
  try {
    // Example: const response = await axios.get(`${OFAC_API_URL}/check/${address}`);

    // For now, return mock data
    return {
      sanctioned: false,
      source: 'OFAC',
      checked: new Date().toISOString()
    };
  } catch (error) {
    console.error('OFAC check error:', error);
    return {
      sanctioned: false,
      source: 'OFAC',
      error: error.message
    };
  }
}

async function checkFATF(address) {
  // Mock implementation - replace with real FATF API call
  try {
    // Example: const response = await axios.get(`${FATF_API_URL}/check/${address}`);

    return {
      sanctioned: false,
      source: 'FATF',
      checked: new Date().toISOString()
    };
  } catch (error) {
    console.error('FATF check error:', error);
    return {
      sanctioned: false,
      source: 'FATF',
      error: error.message
    };
  }
}

async function checkInternalDB(address) {
  // Check internal sanctions database
  // In production, query MongoDB/Redis
  return {
    sanctioned: false,
    source: 'Internal',
    checked: new Date().toISOString()
  };
}

module.exports = router;
