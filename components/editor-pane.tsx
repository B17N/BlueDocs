"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HistoryViewer } from "@/components/history-viewer"
import { Badge } from "@/components/ui/badge"
import { History, UploadCloud, Loader2, Share2, ArrowLeft } from "lucide-react"
import type { FileData } from "@/app/page"
import { ShareDialog } from "@/components/share-dialog"

interface EditorPaneProps {
  file: FileData
  onUpdateFile: (fileId: string, newName: string, newContent: string) => void
  isNew: boolean
  isMobile: boolean
  onBack: () => void
}

type ButtonState = "idle" | "encrypting" | "uploading" | "saving" | "success" | "error"

export function EditorPane({ file, onUpdateFile, isNew, isMobile, onBack }: EditorPaneProps) {
  const [fileName, setFileName] = useState(file.name)
  const [markdownContent, setMarkdownContent] = useState(file.content)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const [initialFileName, setInitialFileName] = useState(file.name)
  const [initialMarkdownContent, setInitialMarkdownContent] = useState(file.content)
  const [isModified, setIsModified] = useState(false)

  useEffect(() => {
    setFileName(file.name)
    setMarkdownContent(file.content)
    setInitialFileName(file.name)
    setInitialMarkdownContent(file.content)
    setIsModified(false)
    setButtonState("idle")
  }, [file])

  useEffect(() => {
    if (isMobile) return // Don't track changes in read-only mobile view
    if (fileName !== initialFileName || markdownContent !== initialMarkdownContent) {
      setIsModified(true)
    } else {
      setIsModified(false)
    }
  }, [fileName, markdownContent, initialFileName, initialMarkdownContent, isMobile])

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isMobile) return
    setFileName(e.target.value)
  }

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isMobile) return
    setMarkdownContent(e.target.value)
  }

  const handleEncryptAndUpdate = async () => {
    setButtonState("encrypting")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setButtonState("uploading")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setButtonState("saving")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onUpdateFile(file.id, fileName, markdownContent)
    setInitialFileName(fileName)
    setInitialMarkdownContent(markdownContent)
    setIsModified(false)
    setButtonState("success")
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setButtonState("idle")
  }

  const getButtonContent = () => {
    switch (buttonState) {
      case "encrypting":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Encrypting...
          </>
        )
      case "uploading":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
          </>
        )
      case "saving":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
          </>
        )
      case "success":
        return <>Successfully {isNew ? "Published" : "Updated"}!</>
      case "error":
        return <>Error {isNew ? "Publishing" : "Updating"}!</>
      default:
        return (
          <>
            <UploadCloud className="h-4 w-4 mr-2" />
            {isNew ? "Encrypt & Publish" : "Encrypt & Update File"}
          </>
        )
    }
  }

  const handleShare = async (address: string) => {
    console.log(`Sharing file ${file.id} with address ${address}`)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    alert(`Access granted to ${address} (mocked).`)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {isMobile && (
        <Button variant="outline" onClick={onBack} className="self-start">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to File List
        </Button>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-grow flex items-center gap-2 min-w-[150px]">
          <Input
            type="text"
            value={fileName}
            onChange={handleFileNameChange}
            placeholder="Enter file name"
            className="flex-grow text-lg font-medium"
            readOnly={isMobile}
          />
          {isModified && !isMobile && (
            <Badge
              variant="outline"
              className="border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-400 whitespace-nowrap"
              title="This file has unsaved changes."
            >
              Unsaved
            </Badge>
          )}
        </div>
        {!isMobile && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleEncryptAndUpdate}
              disabled={
                (buttonState !== "idle" && buttonState !== "success" && buttonState !== "error") ||
                (!isModified && !isNew)
              }
              title={
                !isModified && !isNew ? "No changes to save" : isNew ? "Publish this new file" : "Save your changes"
              }
            >
              {getButtonContent()}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsShareDialogOpen(true)}
              disabled={isNew}
              title={isNew ? "Publish the file first to enable sharing" : "Share file"}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        )}
        <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className={isMobile ? "flex-grow" : ""}>
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
      </div>

      <div className={`flex-1 grid gap-4 overflow-hidden ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className="flex flex-col">
          <label htmlFor="markdown-editor" className="text-sm font-medium mb-1">
            {isMobile ? "Content (Read-Only)" : "Markdown Editor"}
          </label>
          <Textarea
            id="markdown-editor"
            value={markdownContent}
            onChange={handleMarkdownChange}
            className="flex-1 resize-none font-mono text-sm"
            aria-label="Markdown Content"
            readOnly={isMobile}
          />
        </div>
        {!isMobile && (
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Live Preview (placeholder)</label>
            <div className="flex-1 border rounded-md p-4 bg-muted/40 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap break-words text-sm">{markdownContent}</pre>
            </div>
          </div>
        )}
      </div>

      <HistoryViewer
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        versions={file.versions}
        fileName={fileName}
      />
      {!isMobile && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          fileName={fileName}
          fileId={file.id}
          onShare={handleShare}
        />
      )}
    </div>
  )
}
