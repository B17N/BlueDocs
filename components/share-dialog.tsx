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
import { Loader2, Share2, Copy, CheckCircle2, AlertCircle } from "lucide-react"

interface ShareDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  fileName: string
  fileId: string
  fileContent: string
  onShare: () => Promise<{ ipfsHash: string; urlKey: string }>
}

export function ShareDialog({ 
  isOpen, 
  onOpenChange, 
  fileName, 
  fileId, 
  fileContent,
  onShare 
}: ShareDialogProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    // Reset state when dialog visibility changes
    if (!isOpen) {
      setTimeout(() => {
        // Delay reset for animations
        setError(null)
        setIsSharing(false)
        setGeneratedLink(null)
        setLinkCopied(false)
      }, 300)
    } else {
      // If dialog opens, ensure previous link is cleared
      setGeneratedLink(null)
      setLinkCopied(false)
    }
  }, [isOpen, fileId])

  const handleGenerateLink = async () => {
    setError(null)
    setIsSharing(true)
    setGeneratedLink(null)
    setLinkCopied(false)

    try {
      const { ipfsHash, urlKey } = await onShare()
      
      // Generate shareable link with key in fragment
      const shareLink = `${window.location.origin}/view/${ipfsHash}#key=${urlKey}`
      setGeneratedLink(shareLink)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate share link. Please try again.")
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Share "{fileName}"</DialogTitle>
          <DialogDescription>
            Generate a shareable link for this document. Anyone with the link will be able to view the document.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <>
            <div className="py-4">
              <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The document will be encrypted with a unique key. The decryption key will be embedded in the shareable link.
                </p>
              </div>
              {error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleGenerateLink} disabled={isSharing}>
                {isSharing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Generate Share Link
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
                Share link generated successfully!
              </p>
            </div>
            <div>
              <Label htmlFor="share-link">Shareable Link:</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  id="share-link" 
                  type="text" 
                  value={generatedLink} 
                  readOnly 
                  className="bg-muted flex-grow font-mono text-xs" 
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copy link">
                  {linkCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This link contains the decryption key. Share it only with trusted recipients.
              </p>
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
