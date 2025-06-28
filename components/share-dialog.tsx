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
import { useToast } from "@/hooks/use-toast"

interface ShareDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  fileName: string
  fileId: string
  fileContent?: string
  onShare?: (fileContent: string) => Promise<string> // Now returns share URL
}

export function ShareDialog({ isOpen, onOpenChange, fileName, fileId, fileContent, onShare }: ShareDialogProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Reset state when dialog visibility changes or fileId changes
    if (!isOpen) {
      setTimeout(() => {
        // Delay reset for animations
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

  const handleGenerateLink = async () => {
    if (!onShare || !fileContent) {
      setError("Unable to share this document. Please save it first.")
      return
    }
    
    setError(null)
    setIsSharing(true)
    setGeneratedLink(null)
    setLinkCopied(false)

    try {
      const shareUrl = await onShare(fileContent)
      setGeneratedLink(shareUrl)
      
      toast({
        title: "Share link created!",
        description: "Anyone with this link can view your document.",
      })
    } catch (e) {
      console.error("Failed to create share link:", e)
      setError(e instanceof Error ? e.message : "Failed to create share link. Please try again.")
      
      toast({
        title: "Failed to create share link",
        description: e instanceof Error ? e.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000) // Reset copied status after 2s
      
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard.",
      })
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
            Create a shareable link for this document. Anyone with the link will be able to view it without needing a wallet.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                This will create a read-only version of your document that can be accessed via a unique URL.
                The document will be encrypted and stored on IPFS.
              </p>
              
              {error && (
                <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
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
                    Creating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Create Share Link
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
                Share link created successfully!
              </p>
            </div>
            
            <div>
              <Label htmlFor="share-link" className="mb-2 block">Shareable Link:</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="share-link" 
                  type="text" 
                  value={generatedLink} 
                  readOnly 
                  className="bg-muted flex-grow font-mono text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copy link">
                  {linkCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This link contains the decryption key. Keep it safe!
              </p>
            </div>
            
            <DialogFooter>
              <Button type="button" onClick={handleDialogClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
