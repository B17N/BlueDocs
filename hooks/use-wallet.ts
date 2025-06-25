import { useState, useEffect } from 'react';

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

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: '',
    publicKey: '',
    isLoading: false,
    error: ''
  });

  // 检查 MetaMask 是否已安装
  const isMetaMaskInstalled = (): boolean => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // 获取加密公钥
  const getEncryptionPublicKey = async (address: string): Promise<string> => {
    try {
      const encryptionPublicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: [address],
      });
      
      setWalletState(prev => ({ ...prev, publicKey: encryptionPublicKey }));
      return encryptionPublicKey;
    } catch (err) {
      console.error('Error getting encryption public key:', err);
      throw new Error('Failed to get encryption public key');
    }
  };

  // 连接钱包
  const connectWallet = async (): Promise<void> => {
    if (!isMetaMaskInstalled()) {
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
        const publicKey = await getEncryptionPublicKey(address);
        
        setWalletState({
          isConnected: true,
          address,
          publicKey,
          isLoading: false,
          error: ''
        });
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setWalletState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to connect wallet' 
      }));
    }
  };

  // 断开钱包连接
  const disconnectWallet = (): void => {
    setWalletState({
      isConnected: false,
      address: '',
      publicKey: '',
      isLoading: false,
      error: ''
    });
  };

  // 检查钱包连接状态
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            const address = accounts[0];
            getEncryptionPublicKey(address).then((publicKey) => {
              setWalletState({
                isConnected: true,
                address,
                publicKey,
                isLoading: false,
                error: ''
              });
            });
          }
        })
        .catch(console.error);
    }
  }, []);

  return {
    ...walletState,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    getEncryptionPublicKey
  };
}; 