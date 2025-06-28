"use client"

import { Button } from "@/components/ui/button"
import { LogIn, LogOut, Wallet, Loader2, AlertCircle } from "lucide-react"

interface ConnectWalletButtonProps {
  isConnected: boolean
  walletAddress: string | null
  onConnect: () => void
  onDisconnect: () => void
  isLoading?: boolean
  error?: string
}

export function ConnectWalletButton({ 
  isConnected, 
  walletAddress, 
  onConnect, 
  onDisconnect, 
  isLoading = false,
  error 
}: ConnectWalletButtonProps) {
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
    <div className="flex flex-col items-end gap-1">
      <Button onClick={onConnect} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4 mr-2" />
        )}
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
