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
        <p className="text-sm text-muted-foreground">
          No documents found. Create your first encrypted document!
        </p>
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
