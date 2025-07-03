"use client"

import { Button } from "@/components/ui/button"
import { LogIn, LogOut, Wallet } from "lucide-react"

interface ConnectWalletButtonProps {
  isConnected: boolean
  walletAddress: string | null
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectWalletButton({ isConnected, walletAddress, onConnect, onDisconnect }: ConnectWalletButtonProps) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm hidden md:inline">
          <Wallet className="h-4 w-4 inline mr-1" />
          {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connected"}
        </span>
        <Button variant="outline" onClick={onDisconnect} className="bg-card text-card-foreground hover:bg-muted">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={onConnect}>
      <LogIn className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  )
}
