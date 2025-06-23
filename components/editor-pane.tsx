"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HistoryViewer } from "@/components/history-viewer"
import { Badge } from "@/components/ui/badge" // Import Badge component
import { History, UploadCloud, Loader2, Share2 } from "lucide-react"
import type { FileData } from "@/app/page"
import { ShareDialog } from "@/components/share-dialog"

interface EditorPaneProps {
  file: FileData
  onUpdateFile: (fileId: string, newName: string, newContent: string) => void
  isNew: boolean
}

type ButtonState = "idle" | "encrypting" | "uploading" | "saving" | "success" | "error"

export function EditorPane({ file, onUpdateFile, isNew }: EditorPaneProps) {
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
    if (markdownContent.startsWith("# ") && e.target.value.trim() !== "") {
      const lines = markdownContent.split("\n")
      if (
        fileName === lines[0].substring(2).trim() + ".md" ||
        lines[0].substring(2).trim() === initialFileName.replace(".md", "")
      ) {
        lines[0] = `# ${e.target.value.replace(".md", "").trim()}`
        setMarkdownContent(lines.join("\n"))
      }
    }
  }

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdownContent(e.target.value)
    const firstLine = e.target.value.split("\n")[0]
    if (
      firstLine.startsWith("# ") &&
      (fileName === "Untitled.md" || fileName.trim() === "" || fileName === initialFileName) &&
      firstLine.substring(2).trim() !== ""
    ) {
      setFileName(firstLine.substring(2).trim() + ".md")
    }
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
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading to IPFS...
          </>
        )
      case "saving":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving on-chain...
          </>
        )
      case "success":
        // For a new file, "Published" is appropriate. For an existing file, "Updated".
        // The `isNew` prop might be stale if the file was just published.
        // A better check might be if `initialFileName` was "Untitled.md" before this save.
        // However, for simplicity with current state, this is okay.
        return <>Successfully {isNew && buttonState === "success" ? "Published" : "Updated"}!</>
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
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-grow flex items-center gap-2 min-w-[200px]">
          {" "}
          {/* Increased gap for badge */}
          <Input
            type="text"
            value={fileName}
            onChange={handleFileNameChange}
            placeholder="Enter file name (e.g., MyNote.md)"
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleEncryptAndUpdate}
            disabled={
              (buttonState !== "idle" && buttonState !== "success" && buttonState !== "error") ||
              (!isModified && !isNew)
            }
            title={!isModified && !isNew ? "No changes to save" : isNew ? "Publish this new file" : "Save your changes"}
          >
            {getButtonContent()}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsShareDialogOpen(true)}
            className="bg-card text-card-foreground hover:bg-muted"
            disabled={isNew}
            title={isNew ? "Publish the file first to enable sharing" : "Share file"}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsHistoryOpen(true)}
            className="bg-card text-card-foreground hover:bg-muted"
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        <div className="flex flex-col">
          <label htmlFor="markdown-editor" className="text-sm font-medium mb-1">
            Markdown Editor
          </label>
          <Textarea
            id="markdown-editor"
            value={markdownContent}
            onChange={handleMarkdownChange}
            placeholder="Write your Markdown here..."
            className="flex-1 resize-none font-mono text-sm"
            aria-label="Markdown Editor"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Live Preview (placeholder)</label>
          <div
            className="flex-1 border rounded-md p-4 bg-muted/40 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
            aria-label="Markdown Preview"
          >
            <h2 className="text-lg font-semibold mb-2">Preview:</h2>
            <pre className="whitespace-pre-wrap break-words text-sm">{markdownContent}</pre>
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
        fileId={file.id} // Add fileId prop
        onShare={handleShare}
      />
    </div>
  )
}
