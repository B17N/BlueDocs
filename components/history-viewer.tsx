"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Eye, FileClock, Hash } from "lucide-react"
import type { FileVersion } from "@/app/page" // Ensure this path is correct

interface HistoryViewerProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  versions: FileVersion[]
  fileName: string
}

export function HistoryViewer({ isOpen, onOpenChange, versions, fileName }: HistoryViewerProps) {
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    alert(`${type} copied to clipboard!`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] md:max-w-[780px] lg:max-w-[900px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History: {fileName}</DialogTitle>
          <DialogDescription>Browse through previous versions of your file. Versions are read-only.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 my-4 pr-6">
          {" "}
          {/* Added pr-6 for scrollbar space */}
          <div className="space-y-4">
            {versions.length === 0 && <p>No history available.</p>}
            {versions.map((version, index) => (
              <div key={version.cid} className="p-4 border rounded-lg bg-card">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">
                    Version {versions.length - index}
                    {index === 0 && <span className="text-xs text-primary font-normal ml-2">(Latest)</span>}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    <FileClock className="h-3 w-3 inline mr-1" />
                    {new Date(version.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs space-y-1 mb-3">
                  <p className="flex items-center">
                    <Eye className="h-3 w-3 inline mr-2 text-muted-foreground" />
                    IPFS CID: <code className="ml-1 bg-muted px-1 py-0.5 rounded">{version.cid}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-1"
                      onClick={() => handleCopy(version.cid, "CID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </p>
                  <p className="flex items-center">
                    <Hash className="h-3 w-3 inline mr-2 text-muted-foreground" />
                    Transaction: <code className="ml-1 bg-muted px-1 py-0.5 rounded">{version.txHash}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-1"
                      onClick={() => handleCopy(version.txHash, "Transaction Hash")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </p>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-primary hover:underline">View Content</summary>
                  <pre className="mt-2 p-2 bg-muted/50 rounded-md max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                    {version.content}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-background text-foreground hover:bg-accent"
                    onClick={() => handleCopy(version.content, "Content")}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy Content
                  </Button>
                </details>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-card text-card-foreground hover:bg-muted"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
