"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FilePlus2, FileText, RefreshCw } from "lucide-react"
import type { FileData } from "@/app/page" // Ensure this path is correct

interface FileListProps {
  files: FileData[]
  selectedFileId?: string | null
  onSelectFile: (fileId: string) => void
  onNewFile: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function FileList({ files, selectedFileId, onSelectFile, onNewFile, onRefresh, isRefreshing }: FileListProps) {
  // Sort files by latestVersionTimestamp descending
  const sortedFiles = [...files].sort(
    (a, b) => new Date(b.latestVersionTimestamp).getTime() - new Date(a.latestVersionTimestamp).getTime(),
  )

  return (
    <div className="flex flex-col h-full">
      <Button onClick={onNewFile} className="mb-4 w-full">
        <FilePlus2 className="h-4 w-4 mr-2" />
        New File
      </Button>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">My Files</h2>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
            title="Refresh document list"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
      {sortedFiles.length === 0 && !isRefreshing && (
        <div className="flex-1 p-6">
          <div className="max-w-md mx-auto space-y-4 text-sm">
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-2">Welcome to BlueDocs! 👋</h3>
              <p className="text-muted-foreground">This is your new encrypted Markdown document.</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-foreground mb-2">## Getting Started</h4>
                <p className="text-muted-foreground mb-3">Start writing your content here. Your document will be:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">🔐</span>
                    <span><strong className="text-foreground">Encrypted</strong> locally in your browser</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">📦</span>
                    <span><strong className="text-foreground">Stored</strong> on IPFS (decentralized storage)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">🔗</span>
                    <span><strong className="text-foreground">Linked</strong> to your wallet via NFT on Optimism blockchain</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">## Features</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong className="text-foreground">Privacy First</strong>: Only you can decrypt your documents</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong className="text-foreground">Version Control</strong>: Every update creates a new version</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong className="text-foreground">Decentralized</strong>: No central server, your data is truly yours</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <ul>
          {sortedFiles.map((file) => (
            <li key={file.id} className="mb-1">
              <Button
                variant={selectedFileId === file.id ? "secondary" : "ghost"}
                className="w-full justify-start text-left h-auto py-3 px-3"
                onClick={() => onSelectFile(file.id)}
              >
                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                <div className="flex-grow overflow-hidden">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(file.latestVersionTimestamp).toLocaleDateString()}
                  </p>
                </div>
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}
