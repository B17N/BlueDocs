"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";

// 声明 ethereum 类型
declare global {
  interface Window {
    ethereum?: any;
    web3?: any;
  }
}

// 钱包状态接口，描述钱包的连接状态、地址、公钥等
export interface WalletState {
  isConnected: boolean; // 是否已连接
  address: string;      // 钱包地址
  publicKey: string;    // 加密公钥
  isLoading: boolean;   // 是否正在加载
  error: string;        // 错误信息
}

// Context 类型，包含钱包状态和所有操作方法
interface WalletContextType extends WalletState {
  isMetaMaskInstalled: () => boolean;           // 检查 MetaMask 是否安装
  connectWallet: () => Promise<void>;           // 连接钱包
  disconnectWallet: () => void;                 // 断开钱包
  getEncryptionPublicKey: (address: string) => Promise<string>; // 获取加密公钥
}

// 创建钱包 Context，初始值为 undefined
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// 全局变量：标记是否已经请求过公钥，避免重复请求
let globalHasRequestedPublicKey = false;

// Provider 组件，包裹全局 React 子树，提供钱包上下文
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  // 钱包状态管理
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: "",
    publicKey: "",
    isLoading: false,
    error: "",
  });

  // 初始化日志，便于调试
  console.log(
    "[WALLET_PROVIDER] Initializing with globalHasRequestedPublicKey:",
    globalHasRequestedPublicKey
  );

  // 检查 MetaMask 是否已安装
  const isMetaMaskInstalled = (): boolean => {
    // 移动端 MetaMask 浏览器中，ethereum 对象可能需要更多时间注入
    if (typeof window === "undefined") return false;
    
    // 检查标准的 ethereum 对象
    if (typeof window.ethereum !== "undefined") {
      return true;
    }
    
    // 移动端 MetaMask 浏览器的特殊检测
    if (typeof window.web3 !== "undefined") {
      return true;
    }
    
    // 检查是否在 MetaMask 移动端浏览器中
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMetaMaskMobile = /MetaMaskMobile/i.test(userAgent);
    
    if (isMetaMaskMobile) {
      console.log("[WALLET_PROVIDER] Detected MetaMask mobile browser");
      return true;
    }
    
    return false;
  };

  // 等待 ethereum 对象注入的函数（移动端可能需要更多时间）
  const waitForEthereum = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (window.ethereum) {
        resolve(window.ethereum);
        return;
      }

      let attempts = 0;
      const maxAttempts = 20; // 最多等待 2 秒
      const checkInterval = 100; // 每 100ms 检查一次

      const checkForEthereum = () => {
        attempts++;
        
        if (window.ethereum) {
          console.log(`[WALLET_PROVIDER] Ethereum object found after ${attempts * checkInterval}ms`);
          resolve(window.ethereum);
        } else if (attempts >= maxAttempts) {
          reject(new Error("Ethereum object not found after waiting"));
        } else {
          setTimeout(checkForEthereum, checkInterval);
        }
      };

      setTimeout(checkForEthereum, checkInterval);
    });
  };

  // 获取钱包加密公钥（用于加密消息等 Web3 场景）
  const getEncryptionPublicKey = async (
    address: string,
    caller?: string
  ): Promise<string> => {
    // 打印请求日志，便于追踪
    console.log("[PUBLIC_KEY_REQUEST]", {
      caller: caller || "unknown",
      address: address.substring(0, 8) + "...",
      globalHasRequestedBefore: globalHasRequestedPublicKey,
      currentPublicKey: walletState.publicKey ? "exists" : "empty",
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split("\n").slice(1, 4).join("\n"),
    });

    try {
      // 等待并获取 ethereum 对象
      const ethereum = await waitForEthereum();
      
      // 通过以太坊钱包 API 请求加密公钥
      const encryptionPublicKey = await ethereum.request({
        method: "eth_getEncryptionPublicKey",
        params: [address],
      });

      // 打印成功日志
      console.log("[PUBLIC_KEY_SUCCESS]", {
        caller: caller || "unknown",
        publicKey: encryptionPublicKey.substring(0, 20) + "...",
        timestamp: new Date().toISOString(),
      });

      // 标记全局已请求过，避免重复请求
      globalHasRequestedPublicKey = true;
      // 更新钱包状态，保存公钥
      setWalletState((prev) => ({ ...prev, publicKey: encryptionPublicKey }));
      return encryptionPublicKey;
    } catch (err) {
      // 捕获异常并打印错误日志
      console.error("[PUBLIC_KEY_ERROR]", {
        caller: caller || "unknown",
        error: err,
        timestamp: new Date().toISOString(),
      });
      // 抛出自定义错误
      throw new Error("Failed to get encryption public key");
    }
  };

  // 连接钱包，获取账户和公钥
  const connectWallet = async (): Promise<void> => {
    // 日志：开始连接
    console.log("[CONNECT_WALLET_START]", {
      globalHasRequestedPublicKey,
      currentState: walletState,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // 检查 MetaMask
    if (!isMetaMaskInstalled()) {
      console.log("[CONNECT_WALLET_ERROR] MetaMask not installed");
      setWalletState((prev) => ({
        ...prev,
        error:
          "MetaMask is not installed. Please install MetaMask to continue.",
      }));
      return;
    }

    // 设置加载状态
    setWalletState((prev) => ({ ...prev, isLoading: true, error: "" }));

    try {
      // 等待 ethereum 对象（移动端可能需要更多时间）
      console.log("[CONNECT_WALLET] Waiting for ethereum object...");
      const ethereum = await waitForEthereum();
      
      console.log("[CONNECT_WALLET] Ethereum object ready, requesting accounts...");
      
      // 请求账户授权
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        // 日志：获取到账户，准备请求公钥
        console.log("[CONNECT_WALLET] Got accounts, requesting public key...", {
          address: address.substring(0, 8) + "...",
          globalHasRequestedPublicKey,
        });

        // 获取加密公钥
        const publicKey = await getEncryptionPublicKey(
          address,
          "connectWallet"
        );

        // 设置钱包状态为已连接
        setWalletState({
          isConnected: true,
          address,
          publicKey,
          isLoading: false,
          error: "",
        });

        // 日志：连接成功
        console.log("[CONNECT_WALLET_SUCCESS]", {
          address: address.substring(0, 8) + "...",
          hasPublicKey: !!publicKey,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      // 捕获异常，设置错误状态
      console.error("[CONNECT_WALLET_ERROR]", err);
      setWalletState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet",
      }));
    }
  };

  // 断开钱包连接，重置状态
  const disconnectWallet = (): void => {
    // 日志：断开连接
    console.log("[DISCONNECT_WALLET]", {
      wasConnected: walletState.isConnected,
      hadPublicKey: !!walletState.publicKey,
      timestamp: new Date().toISOString(),
    });

    // 重置全局公钥请求标记
    globalHasRequestedPublicKey = false;
    // 重置钱包状态
    setWalletState({
      isConnected: false,
      address: "",
      publicKey: "",
      isLoading: false,
      error: "",
    });
  };

  // 组件挂载时自动检测钱包连接状态，只执行一次

  useEffect(() => {
    // 移动端需要延迟检测，等待 ethereum 对象注入
    const checkWalletConnection = async () => {
      // 日志：检测钱包连接
      console.log("[WALLET_PROVIDER_EFFECT] Checking wallet connection", {
        globalHasRequestedPublicKey,
        currentWalletState: {
          isConnected: walletState.isConnected,
          hasAddress: !!walletState.address,
          hasPublicKey: !!walletState.publicKey,
        },
        timestamp: new Date().toISOString(),
      });

      if (isMetaMaskInstalled()) {
        try {
          // 等待 ethereum 对象（移动端可能需要时间）
          const ethereum = await waitForEthereum();
          
          // 查询当前已连接账户
          const accounts = await ethereum.request({ method: "eth_accounts" });
          
          // 日志：账户信息
          console.log("[WALLET_PROVIDER_EFFECT] eth_accounts response", {
            accountsCount: accounts.length,
            firstAccount: accounts[0]
              ? accounts[0].substring(0, 8) + "..."
              : "none",
            globalHasRequestedPublicKey,
            timestamp: new Date().toISOString(),
          });

          if (accounts.length > 0) {
            const address = accounts[0];

            // 只在首次请求时获取公钥，避免重复弹窗
            if (!globalHasRequestedPublicKey) {
              console.log(
                "[WALLET_PROVIDER_EFFECT] Will request public key (first time)",
                {
                  address: address.substring(0, 8) + "...",
                  reason: "globalHasRequestedPublicKey is false",
                  timestamp: new Date().toISOString(),
                }
              );

              try {
                const publicKey = await getEncryptionPublicKey(address, "providerEffect-firstTime");
                setWalletState({
                  isConnected: true,
                  address,
                  publicKey,
                  isLoading: false,
                  error: "",
                });
              } catch (err) {
                // 用户拒绝公钥授权，仍然设置为已连接但无公钥
                console.warn(
                  "[WALLET_PROVIDER_EFFECT] User denied public key access:",
                  err
                );
                globalHasRequestedPublicKey = true;
                setWalletState({
                  isConnected: true,
                  address,
                  publicKey: "",
                  isLoading: false,
                  error:
                    "Public key access denied. Some features may not work.",
                });
              }
            } else {
              // 已经请求过公钥，直接设置连接状态
              console.log(
                "[WALLET_PROVIDER_EFFECT] Skipping public key request (already requested)",
                {
                  address: address.substring(0, 8) + "...",
                  reason: "globalHasRequestedPublicKey is true",
                  currentPublicKey: walletState.publicKey ? "exists" : "empty",
                  timestamp: new Date().toISOString(),
                }
              );

              setWalletState((prev) => ({
                ...prev,
                isConnected: true,
                address,
                isLoading: false,
              }));
            }
          } else {
            // 没有账户，未连接
            console.log("[WALLET_PROVIDER_EFFECT] No accounts found", {
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          // 查询账户出错
          console.error("[WALLET_PROVIDER_EFFECT] eth_accounts error:", err);
        }
      } else {
        // 未安装 MetaMask
        console.log("[WALLET_PROVIDER_EFFECT] MetaMask not installed");
      }
    };

    // 移动端需要延迟执行，给 ethereum 对象注入更多时间
    const timer = setTimeout(() => {
      checkWalletConnection();
    }, 100);

    return () => clearTimeout(timer);
  }, []); // 依赖数组为空，只在Provider挂载时执行一次

  // 构造 context 值，暴露所有状态和操作方法
  const contextValue: WalletContextType = {
    ...walletState,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    getEncryptionPublicKey: (address: string) =>
      getEncryptionPublicKey(address, "external"),
  };

  // 渲染 Provider，包裹所有子组件
  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// 自定义 Hook：便捷获取钱包上下文
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
