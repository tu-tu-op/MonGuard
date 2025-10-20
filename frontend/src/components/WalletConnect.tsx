import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPublicClient, http, type Address } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import { toMetaMaskSmartAccount, Implementation } from '@metamask/delegation-toolkit';

// Monad Testnet Chain Configuration
const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MONAD',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.monad.xyz'],
    },
    public: {
      http: ['https://testnet.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.testnet.monad.xyz' },
  },
  testnet: true,
} as const;

interface WalletConnectProps {
  onConnect?: (account: Address, smartAccount: any) => void;
  onDisconnect?: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<Address | null>(null);
  const [smartAccount, setSmartAccount] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string>('');

  // Check if MetaMask is already connected
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum === 'undefined') {
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Check if connected to Monad Testnet
        if (chainId === '0xa1f6') { // 41454 in hex
          setNetworkName('Monad Testnet');
        }
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const userAccount = accounts[0] as Address;
      setAccount(userAccount);

      // Switch to Monad Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa1f6' }], // 41454 in hex
        });
        setNetworkName('Monad Testnet');
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xa1f6',
                  chainName: 'Monad Testnet',
                  nativeCurrency: {
                    name: 'Monad',
                    symbol: 'MONAD',
                    decimals: 18,
                  },
                  rpcUrls: ['https://testnet.monad.xyz'],
                  blockExplorerUrls: ['https://explorer.testnet.monad.xyz'],
                },
              ],
            });
            setNetworkName('Monad Testnet');
          } catch (addError) {
            console.error('Error adding Monad Testnet:', addError);
            setError('Failed to add Monad Testnet to MetaMask');
            setIsConnecting(false);
            return;
          }
        } else {
          console.error('Error switching to Monad Testnet:', switchError);
          setError('Failed to switch to Monad Testnet');
          setIsConnecting(false);
          return;
        }
      }

      // Create Viem Public Client for Monad Testnet
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(),
      });

      // Create Bundler Client (you may need to configure a bundler URL for Monad)
      const bundlerClient = createBundlerClient({
        client: publicClient,
        transport: http('https://testnet.monad.xyz'), // Update with actual bundler URL if available
      });

      // Create MetaMask Smart Account using Delegation Toolkit
      try {
        const mmSmartAccount = await toMetaMaskSmartAccount({
          client: publicClient,
          implementation: Implementation.Hybrid,
          deployParams: [userAccount, [], []],
          deploySalt: '0x',
          signer: {
            address: userAccount,
            signMessage: async ({ message }: { message: any }) => {
              const msg = typeof message === 'string' ? message : message.raw;
              return await window.ethereum.request({
                method: 'personal_sign',
                params: [msg, userAccount],
              }) as `0x${string}`;
            },
            signTypedData: async (typedData: any) => {
              return await window.ethereum.request({
                method: 'eth_signTypedData_v4',
                params: [userAccount, JSON.stringify(typedData)],
              }) as `0x${string}`;
            },
          } as any,
        });

        setSmartAccount(mmSmartAccount);
        setIsConnected(true);

        // Call the onConnect callback if provided
        if (onConnect) {
          onConnect(userAccount, mmSmartAccount);
        }
      } catch (smartAccountError) {
        console.error('Error creating smart account:', smartAccountError);
        // Continue without smart account - user can still use regular account
        setIsConnected(true);
      }

    } catch (err: any) {
      console.error('Error connecting to MetaMask:', err);
      setError(err.message || 'Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSmartAccount(null);
    setIsConnected(false);
    setNetworkName('');
    if (onDisconnect) {
      onDisconnect();
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0] as Address);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  if (isConnected && account) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3"
      >
        <Badge
          variant="secondary"
          className="gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {networkName || 'Connected'}
        </Badge>
        
        <Card className="border-none shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-2 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </span>
              {smartAccount && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Smart Account
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectWallet}
              className="h-8 px-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              Connect MetaMask
            </>
          )}
        </Button>
        
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2"
          >
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-3 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Extend window.ethereum type
declare global {
  interface Window {
    ethereum?: any;
  }
}
