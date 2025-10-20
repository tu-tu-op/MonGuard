# MonGuard SDK

JavaScript/TypeScript SDK for integrating MonGuard compliance and AML into your dApps.

## Installation

```bash
npm install @monguard/sdk
```

## Quick Start

```typescript
import { MonGuardClient, RiskLevel } from '@monguard/sdk';

const client = new MonGuardClient({
  rpcUrl: 'https://rpc.monad.xyz',
  riskRegistryAddress: '0x...',
  complianceOracleAddress: '0x...',
  transactionMonitorAddress: '0x...',
  enforcementAddress: '0x...',
  apiUrl: 'https://api.monguard.xyz',
  apiKey: 'your-api-key'
});

// Pre-transaction compliance check
const check = await client.preTransactionCheck(
  fromAddress,
  toAddress,
  amount
);

if (check.shouldProceed) {
  // Safe to proceed
  await sendTransaction();
} else {
  console.error('Transaction risks:', check.risks);
}
```

## Features

- **Compliance Checking**: Verify addresses against sanctions lists
- **Risk Assessment**: Get AI-powered risk scores for addresses
- **Transaction Monitoring**: Check if transactions will be allowed
- **Event Listening**: Subscribe to compliance events
- **Pattern Analysis**: Detect suspicious transaction patterns

## API Reference

See full documentation at https://docs.monguard.xyz
