"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Share2 } from "lucide-react"

interface ShareDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  fileName: string
  onShare: (address: string) => Promise<void>
}

export function ShareDialog({ isOpen, onOpenChange, fileName, onShare }: ShareDialogProps) {
  const [address, setAddress] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value)
    if (error) setError(null)
  }

  const handleSubmit = async () => {
    // Basic validation for an Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError("Please enter a valid Ethereum address.")
      return
    }
    setError(null)
    setIsSharing(true)
    try {
      await onShare(address)
      // On success, close the dialog
      onOpenChange(false)
    } catch (e) {
      setError("Failed to grant access. Please try again.")
    } finally {
      setIsSharing(false)
    }
  }

  // Reset component state when the dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setAddress("")
        setError(null)
        setIsSharing(false)
      }, 300) // Delay reset to allow for closing animation
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share "{fileName}"</DialogTitle>
          <DialogDescription>
            Enter the wallet address to grant read access. This will encrypt the file's key for them and record it
            on-chain.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={handleAddressChange}
              placeholder="0x..."
              className="col-span-3"
              aria-describedby="address-error"
            />
          </div>
          {error && (
            <p id="address-error" className="col-span-4 text-red-500 text-sm text-center -mt-2">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSharing || !address}>
            {isSharing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Granting Access...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Grant Access
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
