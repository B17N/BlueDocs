"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Loader2, Share2, Copy, CheckCircle2 } from "lucide-react"

interface ShareDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  fileName: string
  fileId: string // Added fileId
  onShare: (address: string) => Promise<void>
}

export function ShareDialog({ isOpen, onOpenChange, fileName, fileId, onShare }: ShareDialogProps) {
  const [address, setAddress] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    // Reset state when dialog visibility changes or fileId changes
    if (!isOpen) {
      setTimeout(() => {
        // Delay reset for animations
        setAddress("")
        setError(null)
        setIsSharing(false)
        setGeneratedLink(null)
        setLinkCopied(false)
      }, 300)
    } else {
      // If dialog opens, ensure previous link is cleared if file changes
      setGeneratedLink(null)
      setLinkCopied(false)
    }
  }, [isOpen, fileId])

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value)
    if (error) setError(null)
    if (generatedLink) setGeneratedLink(null) // Clear link if address changes
  }

  const handleSubmit = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError("Please enter a valid Ethereum address.")
      return
    }
    setError(null)
    setIsSharing(true)
    setGeneratedLink(null)
    setLinkCopied(false)

    try {
      await onShare(address)
      // Generate shareable link (mocked)
      const shareLink = `${window.location.origin}/view/${fileId}`
      setGeneratedLink(shareLink)
      // Don't close dialog automatically, let user copy link
    } catch (e) {
      setError("Failed to grant access. Please try again.")
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000) // Reset copied status after 2s
    }
  }

  const handleDialogClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Share "{fileName}"</DialogTitle>
          <DialogDescription>
            Enter the wallet address to grant read access. This will (mock) encrypt the file's key for them and record
            it on-chain.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <>
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
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
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
          </>
        ) : (
          <div className="py-4 space-y-4">
            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Access granted to <span className="font-semibold">{address}</span>.
              </p>
            </div>
            <div>
              <Label htmlFor="share-link">Shareable Link:</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input id="share-link" type="text" value={generatedLink} readOnly className="bg-muted flex-grow" />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copy link">
                  {linkCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleDialogClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
