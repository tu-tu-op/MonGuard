/**
 * MonGuard SDK
 * Easy integration of AML and compliance into dApps
 */

import { ethers, Provider, Signer } from 'ethers';
import axios, { AxiosInstance } from 'axios';

export interface MonGuardConfig {
  rpcUrl: string;
  riskRegistryAddress: string;
  complianceOracleAddress: string;
  transactionMonitorAddress: string;
  enforcementAddress: string;
  apiUrl?: string;
  apiKey?: string;
}

export enum RiskLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum PatternType {
  NORMAL = 0,
  STRUCTURING = 1,
  RAPID_MOVEMENT = 2,
  MIXING = 3,
  HIGH_VOLUME = 4,
  SANCTION_INTERACTION = 5
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  timestamp: number;
  reason: string;
  assessor: string;
  active: boolean;
}

export interface TransactionCheckResult {
  allowed: boolean;
  action: number;
  reason: string;
}

export interface ComplianceCheck {
  isSanctioned: boolean;
  isPEP: boolean;
  jurisdiction: string;
  timestamp: number;
}

export class MonGuardClient {
  private provider: Provider;
  private riskRegistry: ethers.Contract;
  private complianceOracle: ethers.Contract;
  private transactionMonitor: ethers.Contract;
  private enforcement: ethers.Contract;
  private apiClient?: AxiosInstance;

  constructor(config: MonGuardConfig, signerOrProvider?: Signer | Provider) {
    // Initialize provider
    if (signerOrProvider) {
      // Check if it's a Signer by checking if it has a provider property
      this.provider = 'provider' in signerOrProvider && signerOrProvider.provider
        ? signerOrProvider.provider
        : signerOrProvider as Provider;
    } else {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    }

    // Initialize contracts
    const riskRegistryABI = [
      'function getRiskAssessment(address target) view returns (tuple(uint8 level, uint256 score, uint256 timestamp, string reason, address assessor, bool active))',
      'function getRiskLevel(address target) view returns (uint8)',
      'function getRiskScore(address target) view returns (uint256)',
      'function isHighRisk(address target) view returns (bool)',
      'function assessRisk(address target, uint8 level, uint256 score, string reason)',
      'event RiskAssessed(address indexed target, uint8 level, uint256 score, string reason, address indexed assessor)'
    ];

    const complianceOracleABI = [
      'function isSanctioned(address target) view returns (bool)',
      'function getComplianceCheck(address target) view returns (tuple(bool isSanctioned, bool isPEP, string jurisdiction, uint256 timestamp, bytes32 dataSourceId))',
      'function isCompliant(address target) view returns (bool)',
      'event AddressSanctioned(address indexed target, bytes32 indexed dataSourceId, string reason)'
    ];

    const transactionMonitorABI = [
      'function getTransactionAnalysis(bytes32 txHash) view returns (tuple(bytes32 txHash, address from, address to, uint256 amount, uint8 pattern, uint8 severity, uint256 anomalyScore, uint256 timestamp, bool flagged, string notes))',
      'event TransactionAnalyzed(bytes32 indexed txHash, address indexed from, address indexed to, uint8 pattern, uint256 anomalyScore)',
      'event SuspiciousPatternDetected(address indexed target, uint8 pattern, uint256 score)'
    ];

    const enforcementABI = [
      'function checkTransaction(address from, address to, uint256 amount) view returns (bool allowed, uint8 action, string reason)',
      'function getAccountStatus(address account) view returns (tuple(bool frozen, bool whitelisted, uint8 defaultAction, uint256 dailyLimit, uint256 dailySpent, uint256 lastResetTimestamp, uint256 freezeTimestamp, address freezeInitiator, string freezeReason))',
      'event AccountFrozen(address indexed account, address indexed initiator, string reason)',
      'event TransactionBlocked(address indexed from, address indexed to, uint256 amount, string reason)'
    ];

    this.riskRegistry = new ethers.Contract(
      config.riskRegistryAddress,
      riskRegistryABI,
      signerOrProvider || this.provider
    );

    this.complianceOracle = new ethers.Contract(
      config.complianceOracleAddress,
      complianceOracleABI,
      signerOrProvider || this.provider
    );

    this.transactionMonitor = new ethers.Contract(
      config.transactionMonitorAddress,
      transactionMonitorABI,
      signerOrProvider || this.provider
    );

    this.enforcement = new ethers.Contract(
      config.enforcementAddress,
      enforcementABI,
      signerOrProvider || this.provider
    );

    // Initialize API client if configured
    if (config.apiUrl) {
      this.apiClient = axios.create({
        baseURL: config.apiUrl,
        headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {}
      });
    }
  }

  /**
   * Check if an address is compliant
   */
  async isCompliant(address: string): Promise<boolean> {
    return await this.complianceOracle.isCompliant(address);
  }

  /**
   * Check if an address is sanctioned
   */
  async isSanctioned(address: string): Promise<boolean> {
    return await this.complianceOracle.isSanctioned(address);
  }

  /**
   * Get risk assessment for an address
   */
  async getRiskAssessment(address: string): Promise<RiskAssessment> {
    const result = await this.riskRegistry.getRiskAssessment(address);
    return {
      level: Number(result.level),
      score: Number(result.score),
      timestamp: Number(result.timestamp),
      reason: result.reason,
      assessor: result.assessor,
      active: result.active
    };
  }

  /**
   * Get risk score (0-100) for an address
   */
  async getRiskScore(address: string): Promise<number> {
    const score = await this.riskRegistry.getRiskScore(address);
    return Number(score);
  }

  /**
   * Get risk level for an address
   */
  async getRiskLevel(address: string): Promise<RiskLevel> {
    const level = await this.riskRegistry.getRiskLevel(address);
    return Number(level) as RiskLevel;
  }

  /**
   * Check if an address is high risk
   */
  async isHighRisk(address: string): Promise<boolean> {
    return await this.riskRegistry.isHighRisk(address);
  }

  /**
   * Check if a transaction would be allowed
   */
  async checkTransaction(
    from: string,
    to: string,
    amount: bigint
  ): Promise<TransactionCheckResult> {
    const result = await this.enforcement.checkTransaction(from, to, amount);
    return {
      allowed: result.allowed,
      action: Number(result.action),
      reason: result.reason
    };
  }

  /**
   * Get compliance check for an address
   */
  async getComplianceCheck(address: string): Promise<ComplianceCheck> {
    const result = await this.complianceOracle.getComplianceCheck(address);
    return {
      isSanctioned: result.isSanctioned,
      isPEP: result.isPEP,
      jurisdiction: result.jurisdiction,
      timestamp: Number(result.timestamp)
    };
  }

  /**
   * Pre-transaction compliance check
   * Recommended to call before submitting transactions
   */
  async preTransactionCheck(
    from: string,
    to: string,
    amount: bigint
  ): Promise<{
    safe: boolean;
    risks: string[];
    warnings: string[];
    shouldProceed: boolean;
  }> {
    const risks: string[] = [];
    const warnings: string[] = [];

    // Check sender compliance
    const [fromCompliant, fromRiskLevel, fromSanctioned] = await Promise.all([
      this.isCompliant(from),
      this.getRiskLevel(from),
      this.isSanctioned(from)
    ]);

    if (fromSanctioned) {
      risks.push('Sender address is sanctioned');
    }

    if (!fromCompliant) {
      risks.push('Sender failed compliance check');
    }

    if (fromRiskLevel >= RiskLevel.HIGH) {
      risks.push('Sender has high risk level');
    } else if (fromRiskLevel >= RiskLevel.MEDIUM) {
      warnings.push('Sender has medium risk level');
    }

    // Check receiver compliance
    const [toCompliant, toRiskLevel, toSanctioned] = await Promise.all([
      this.isCompliant(to),
      this.getRiskLevel(to),
      this.isSanctioned(to)
    ]);

    if (toSanctioned) {
      risks.push('Receiver address is sanctioned');
    }

    if (!toCompliant) {
      risks.push('Receiver failed compliance check');
    }

    if (toRiskLevel >= RiskLevel.HIGH) {
      risks.push('Receiver has high risk level');
    } else if (toRiskLevel >= RiskLevel.MEDIUM) {
      warnings.push('Receiver has medium risk level');
    }

    // Check transaction enforcement
    const txCheck = await this.checkTransaction(from, to, amount);

    if (!txCheck.allowed) {
      risks.push(`Transaction blocked: ${txCheck.reason}`);
    }

    const safe = risks.length === 0;
    const shouldProceed = safe && warnings.length === 0;

    return {
      safe,
      risks,
      warnings,
      shouldProceed
    };
  }

  /**
   * Listen for risk assessment events
   */
  onRiskAssessed(
    callback: (target: string, level: RiskLevel, score: number, reason: string) => void
  ): () => void {
    const filter = this.riskRegistry.filters.RiskAssessed();

    const listener = (target: string, level: number, score: bigint, reason: string) => {
      callback(target, level as RiskLevel, Number(score), reason);
    };

    this.riskRegistry.on(filter, listener);

    // Return cleanup function
    return () => {
      this.riskRegistry.off(filter, listener);
    };
  }

  /**
   * Listen for transaction blocked events
   */
  onTransactionBlocked(
    callback: (from: string, to: string, amount: bigint, reason: string) => void
  ): () => void {
    const filter = this.enforcement.filters.TransactionBlocked();
    this.enforcement.on(filter, callback);

    return () => {
      this.enforcement.off(filter, callback);
    };
  }

  /**
   * Get AI-powered risk analysis (requires API)
   */
  async getAIRiskAnalysis(address: string): Promise<any> {
    if (!this.apiClient) {
      throw new Error('API client not configured');
    }

    const response = await this.apiClient.get(`/analyze/wallet/${address}`);
    return response.data;
  }

  /**
   * Analyze transaction pattern (requires API)
   */
  async analyzeTransactionPattern(transactions: any[]): Promise<any> {
    if (!this.apiClient) {
      throw new Error('API client not configured');
    }

    const response = await this.apiClient.post('/analyze/pattern', {
      transactions
    });
    return response.data;
  }
}

export default MonGuardClient;
