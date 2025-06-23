"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FilePlus2, FileText } from "lucide-react"
import type { FileData } from "@/app/page" // Ensure this path is correct

interface FileListProps {
  files: FileData[]
  selectedFileId?: string | null
  onSelectFile: (fileId: string) => void
  onNewFile: () => void
}

export function FileList({ files, selectedFileId, onSelectFile, onNewFile }: FileListProps) {
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
      <h2 className="text-lg font-semibold mb-2">My Files</h2>
      {sortedFiles.length === 0 && <p className="text-sm text-muted-foreground">No files yet. Create one!</p>}
      <ScrollArea className="flex-1">
        <ul>
          {sortedFiles.map((file) => (
            <li key={file.id} className="mb-1">
              <Button
                variant={selectedFileId === file.id ? "secondary" : "ghost"}
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => onSelectFile(file.id)}
              >
                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate flex-grow">{file.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}
