"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Wallet } from "lucide-react";

interface ConnectWalletButtonProps {
  isConnected: boolean;
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectWalletButton({
  isConnected,
  walletAddress,
  onConnect,
  onDisconnect,
}: ConnectWalletButtonProps) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm hidden md:inline">
          <Wallet className="h-4 w-4 inline mr-1" />
          {walletAddress
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : "Connected"}
        </span>
        <Button
          variant="outline"
          onClick={onDisconnect}
          className="bg-card text-card-foreground hover:bg-muted"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </Button>
      </div>
    );
  }

  const handleConnect = async () => {
    // 移动端增加额外的日志和延迟处理
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|MetaMaskMobile/i.test(userAgent);
    
    console.log("[CONNECT_BUTTON] Connect clicked", {
      isMobile,
      userAgent,
      hasEthereum: !!window.ethereum,
      timestamp: new Date().toISOString()
    });

    if (isMobile && !window.ethereum) {
      // 移动端可能需要等待 ethereum 对象注入
      console.log("[CONNECT_BUTTON] Mobile detected, waiting for ethereum...");
      
      let attempts = 0;
      const maxAttempts = 30; // 3秒
      const checkInterval = 100;
      
      while (attempts < maxAttempts && !window.ethereum) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        attempts++;
      }
      
      if (window.ethereum) {
        console.log(`[CONNECT_BUTTON] Ethereum found after ${attempts * checkInterval}ms`);
      } else {
        console.log("[CONNECT_BUTTON] Ethereum not found after waiting");
      }
    }

    onConnect();
  };

  return (
    <Button onClick={handleConnect}>
      <LogIn className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
