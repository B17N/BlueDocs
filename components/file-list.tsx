"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { FileData } from "@/app/page"
import { FilePlus2, FileText, RefreshCw, Minus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRef } from "react"

const FileItem = ({
  file,
  isSelected,
  isMobile,
  onSelect,
  onDelete,
}: {
  file: FileData
  isSelected: boolean
  isMobile: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const wasLongPress = useRef(false)

  const handlePointerDown = () => {
    if (isMobile) {
      wasLongPress.current = false
      longPressTimer.current = setTimeout(() => {
        wasLongPress.current = true
        onDelete(file.id)
      }, 500) // 500ms for a long press
    }
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const handleClick = () => {
    if (wasLongPress.current) {
      return // Don't select if a long press just happened
    }
    onSelect(file.id)
  }

  return (
    <div
      className="group relative"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // Cancel long press if pointer leaves
      onClick={handleClick}
    >
      <div
        className={cn(
          "w-full justify-start text-left h-auto py-2 px-3 rounded-md",
          "flex items-center cursor-pointer",
          isSelected ? "bg-secondary text-secondary-foreground" : "hover:bg-accent",
        )}
      >
        <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate flex-grow">{file.name}</span>
      </div>
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(file.id)
          }}
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Delete file</span>
        </Button>
      )}
    </div>
  )
}

interface FileListProps {
  files: FileData[]
  selectedFileId?: string | null
  onSelectFile: (fileId: string) => void
  onNewFile: () => void
  onRefresh: () => void
  onDeleteFile: (fileId: string) => void
  isMobile: boolean
}

export function FileList({
  files,
  selectedFileId,
  onSelectFile,
  onNewFile,
  onRefresh,
  onDeleteFile,
  isMobile,
}: FileListProps) {
  const sortedFiles = [...files].sort(
    (a, b) => new Date(b.latestVersionTimestamp).getTime() - new Date(a.latestVersionTimestamp).getTime(),
  )
  const regularFiles = sortedFiles.filter((f) => !f.isDeleted)
  const deletedFiles = sortedFiles.filter((f) => f.isDeleted)

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-4">
        <Button onClick={onNewFile} className="flex-1">
          <FilePlus2 className="h-4 w-4 mr-2" />
          New File
        </Button>
        <Button onClick={onRefresh} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <Tabs defaultValue="files" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">My Files</TabsTrigger>
          <TabsTrigger value="deleted">Deleted</TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="flex-1 mt-2 min-h-0">
          <ScrollArea className="h-full">
            {regularFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No files yet. Create one!</p>
            )}
            <ul>
              {regularFiles.map((file) => (
                <li key={file.id} className="mb-1">
                  <FileItem
                    file={file}
                    isSelected={selectedFileId === file.id}
                    isMobile={isMobile}
                    onSelect={onSelectFile}
                    onDelete={onDeleteFile}
                  />
                </li>
              ))}
            </ul>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="deleted" className="flex-1 mt-2 min-h-0">
          <ScrollArea className="h-full">
            {deletedFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No deleted files.</p>
            )}
            <ul>
              {deletedFiles.map((file) => (
                <li key={file.id} className="mb-1 p-2 text-muted-foreground text-sm flex items-center">
                  <FileText className="h-4 w-4 mr-2 inline-block flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
