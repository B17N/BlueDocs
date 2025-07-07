"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HistoryViewer } from "@/components/history-viewer"
import { Badge } from "@/components/ui/badge"
import {
  History,
  UploadCloud,
  Loader2,
  Share2,
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  ImageIcon,
  Table,
} from "lucide-react"
import type { FileData } from "@/app/page"
import { ShareDialog } from "@/components/share-dialog"

interface EditorPaneProps {
  file: FileData
  onUpdateFile: (fileId: string, newName: string, newContent: string) => void
  isNew: boolean
  isMobile: boolean
  isProcessing: boolean
  onBack: () => void
}

type ButtonState = "idle" | "encrypting" | "uploading" | "saving" | "success" | "error"

export function EditorPane({ file, onUpdateFile, isNew, isMobile, isProcessing, onBack }: EditorPaneProps) {
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
    if (fileName !== initialFileName || markdownContent !== initialMarkdownContent) {
      setIsModified(true)
    } else {
      setIsModified(false)
    }
  }, [fileName, markdownContent, initialFileName, initialMarkdownContent])

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value)
  }

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdownContent(e.target.value)
  }

  const handleEncryptAndUpdate = async () => {
    onUpdateFile(file.id, fileName, markdownContent)
    setInitialFileName(fileName)
    setInitialMarkdownContent(markdownContent)
    setIsModified(false)
  }

  const getButtonContent = () => {
    if (isProcessing) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
        </>
      )
    }

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
            {isNew ? "Publish" : "Update"}
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
        <Button variant="outline" onClick={onBack} className="self-start bg-transparent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to File List
        </Button>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={fileName}
            onChange={handleFileNameChange}
            placeholder="Enter file name"
            className="flex-grow text-lg font-medium"
          />
          {isModified && (
            <Badge
              variant="outline"
              className="border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-400 whitespace-nowrap"
              title="This file has unsaved changes."
            >
              Unsaved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleEncryptAndUpdate}
            disabled={
              isProcessing ||
              (buttonState !== "idle" && buttonState !== "success" && buttonState !== "error") ||
              (!isModified && !isNew)
            }
            title={
              isProcessing 
                ? "Please wait, processing..."
                : !isModified && !isNew 
                  ? "No changes to save" 
                  : isNew 
                    ? "Publish this new file" 
                    : "Save your changes"
            }
            className="flex-1"
          >
            {getButtonContent()}
          </Button>
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              onClick={() => setIsShareDialogOpen(true)}
              disabled={isNew}
              title={isNew ? "Publish the file first to enable sharing" : "Share file"}
              className="flex-1"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="flex-1">
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-col border rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Strikethrough className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Heading2 className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Quote className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Code className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Table className="h-4 w-4" />
            </Button>
          </div>

          {/* Editor Content Area */}
          <div className={`flex-1 flex ${isMobile ? "flex-col" : "flex-row"} overflow-hidden`}>
            {/* Markdown Editor */}
            <div className="flex-1 flex flex-col">
              <div className="p-2 border-b bg-muted/10">
                <span className="text-xs font-medium text-muted-foreground">Markdown</span>
              </div>
              <Textarea
                id="markdown-editor"
                value={markdownContent}
                onChange={handleMarkdownChange}
                className="flex-1 resize-none font-mono text-sm border-0 rounded-none focus-visible:ring-0"
                aria-label="Markdown Content"
                placeholder="Start writing your markdown content..."
              />
            </div>

            {/* Preview Pane */}
            {!isMobile && (
              <>
                <div className="w-px bg-border" />
                <div className="flex-1 flex flex-col">
                  <div className="p-2 border-b bg-muted/10">
                    <span className="text-xs font-medium text-muted-foreground">Preview</span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap break-words text-sm font-sans">{markdownContent}</pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <HistoryViewer
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        versions={file.versions}
        fileName={fileName}
      />
      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        fileName={fileName}
        fileId={file.id}
        onShare={handleShare}
      />
    </div>
  )
}
