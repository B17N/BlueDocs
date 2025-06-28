"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// 声明 ethereum 类型
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string;
  publicKey: string;
  isLoading: boolean;
  error: string;
}

interface WalletContextType extends WalletState {
  isMetaMaskInstalled: () => boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getEncryptionPublicKey: (address: string) => Promise<string>;
}

// 创建Context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// 全局共享的公钥请求状态
let globalHasRequestedPublicKey = false;

// Provider组件
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: '',
    publicKey: '',
    isLoading: false,
    error: ''
  });

  console.log('[WALLET_PROVIDER] Initializing with globalHasRequestedPublicKey:', globalHasRequestedPublicKey);

  // 检查 MetaMask 是否已安装
  const isMetaMaskInstalled = (): boolean => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // 获取加密公钥
  const getEncryptionPublicKey = async (address: string, caller?: string): Promise<string> => {
    console.log('[PUBLIC_KEY_REQUEST]', {
      caller: caller || 'unknown',
      address: address.substring(0, 8) + '...',
      globalHasRequestedBefore: globalHasRequestedPublicKey,
      currentPublicKey: walletState.publicKey ? 'exists' : 'empty',
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });

    try {
      const encryptionPublicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: [address],
      });
      
      console.log('[PUBLIC_KEY_SUCCESS]', {
        caller: caller || 'unknown',
        publicKey: encryptionPublicKey.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
      
      globalHasRequestedPublicKey = true;
      setWalletState(prev => ({ ...prev, publicKey: encryptionPublicKey }));
      return encryptionPublicKey;
    } catch (err) {
      console.error('[PUBLIC_KEY_ERROR]', {
        caller: caller || 'unknown',
        error: err,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to get encryption public key');
    }
  };

  // 连接钱包
  const connectWallet = async (): Promise<void> => {
    console.log('[CONNECT_WALLET_START]', {
      globalHasRequestedPublicKey,
      currentState: walletState,
      timestamp: new Date().toISOString()
    });

    if (!isMetaMaskInstalled()) {
      console.log('[CONNECT_WALLET_ERROR] MetaMask not installed');
      setWalletState(prev => ({ 
        ...prev, 
        error: 'MetaMask is not installed. Please install MetaMask to continue.' 
      }));
      return;
    }

    setWalletState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        const address = accounts[0];
        console.log('[CONNECT_WALLET] Got accounts, requesting public key...', {
          address: address.substring(0, 8) + '...',
          globalHasRequestedPublicKey
        });
        
        const publicKey = await getEncryptionPublicKey(address, 'connectWallet');
        
        setWalletState({
          isConnected: true,
          address,
          publicKey,
          isLoading: false,
          error: ''
        });

        console.log('[CONNECT_WALLET_SUCCESS]', {
          address: address.substring(0, 8) + '...',
          hasPublicKey: !!publicKey,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('[CONNECT_WALLET_ERROR]', err);
      setWalletState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to connect wallet' 
      }));
    }
  };

  // 断开钱包连接
  const disconnectWallet = (): void => {
    console.log('[DISCONNECT_WALLET]', {
      wasConnected: walletState.isConnected,
      hadPublicKey: !!walletState.publicKey,
      timestamp: new Date().toISOString()
    });
    
    globalHasRequestedPublicKey = false;
    setWalletState({
      isConnected: false,
      address: '',
      publicKey: '',
      isLoading: false,
      error: ''
    });
  };

  // 检查钱包连接状态 - 只在Provider中运行一次
  useEffect(() => {
    console.log('[WALLET_PROVIDER_EFFECT] Checking wallet connection', {
      globalHasRequestedPublicKey,
      currentWalletState: {
        isConnected: walletState.isConnected,
        hasAddress: !!walletState.address,
        hasPublicKey: !!walletState.publicKey
      },
      timestamp: new Date().toISOString()
    });

    if (isMetaMaskInstalled()) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          console.log('[WALLET_PROVIDER_EFFECT] eth_accounts response', {
            accountsCount: accounts.length,
            firstAccount: accounts[0] ? accounts[0].substring(0, 8) + '...' : 'none',
            globalHasRequestedPublicKey,
            timestamp: new Date().toISOString()
          });

          if (accounts.length > 0) {
            const address = accounts[0];
            
            // 只有在没有请求过公钥时才请求公钥，避免重复请求
            if (!globalHasRequestedPublicKey) {
              console.log('[WALLET_PROVIDER_EFFECT] Will request public key (first time)', {
                address: address.substring(0, 8) + '...',
                reason: 'globalHasRequestedPublicKey is false',
                timestamp: new Date().toISOString()
              });

              getEncryptionPublicKey(address, 'providerEffect-firstTime').then((publicKey) => {
                setWalletState({
                  isConnected: true,
                  address,
                  publicKey,
                  isLoading: false,
                  error: ''
                });
              }).catch((err) => {
                // 如果用户拒绝提供公钥，仍然设置为已连接但没有公钥
                console.warn('[WALLET_PROVIDER_EFFECT] User denied public key access:', err);
                globalHasRequestedPublicKey = true;
                setWalletState({
                  isConnected: true,
                  address,
                  publicKey: '',
                  isLoading: false,
                  error: 'Public key access denied. Some features may not work.'
                });
              });
            } else {
              // 如果已经请求过公钥，直接设置连接状态
              console.log('[WALLET_PROVIDER_EFFECT] Skipping public key request (already requested)', {
                address: address.substring(0, 8) + '...',
                reason: 'globalHasRequestedPublicKey is true',
                currentPublicKey: walletState.publicKey ? 'exists' : 'empty',
                timestamp: new Date().toISOString()
              });

              setWalletState(prev => ({
                ...prev,
                isConnected: true,
                address,
                isLoading: false
              }));
            }
          } else {
            console.log('[WALLET_PROVIDER_EFFECT] No accounts found', {
              timestamp: new Date().toISOString()
            });
          }
        })
        .catch((err: any) => {
          console.error('[WALLET_PROVIDER_EFFECT] eth_accounts error:', err);
        });
    } else {
      console.log('[WALLET_PROVIDER_EFFECT] MetaMask not installed');
    }
  }, []); // 依赖数组为空，只在Provider挂载时执行一次

  const contextValue: WalletContextType = {
    ...walletState,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    getEncryptionPublicKey: (address: string) => getEncryptionPublicKey(address, 'external')
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook for using wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 