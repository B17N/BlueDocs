"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HistoryViewer } from "@/components/history-viewer"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
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
import { createSharePayload } from "@/lib/share-encryption"
import { uploadToIPFS } from "@/lib/ipfs"
import { toast } from "sonner"

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // 辅助函数：获取当前选中的文本或光标位置
  const getTextareaSelection = () => {
    if (!textareaRef.current) return { start: 0, end: 0, selectedText: "" }
    
    const { selectionStart, selectionEnd, value } = textareaRef.current
    return {
      start: selectionStart,
      end: selectionEnd,
      selectedText: value.substring(selectionStart, selectionEnd)
    }
  }

  // 辅助函数：在光标位置插入文本
  const insertText = (prefix: string, suffix: string = "", placeholder: string = "") => {
    if (!textareaRef.current) return
    
    const { start, end, selectedText } = getTextareaSelection()
    let newText = ""
    
    if (selectedText) {
      newText = prefix + selectedText + suffix
    } else {
      newText = prefix + placeholder + suffix
    }
    
    const newContent = markdownContent.slice(0, start) + newText + markdownContent.slice(end)
    setMarkdownContent(newContent)
    
    // 设置新的光标位置
    setTimeout(() => {
      if (textareaRef.current) {
        if (selectedText) {
          textareaRef.current.setSelectionRange(start, start + newText.length)
        } else {
          textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length)
        }
        textareaRef.current.focus()
      }
    }, 0)
  }

  // 工具栏按钮处理函数
  const handleBold = () => insertText("**", "**", "bold text")
  const handleItalic = () => insertText("*", "*", "italic text")
  const handleStrikethrough = () => insertText("~~", "~~", "strikethrough text")
  const handleHeading1 = () => insertText("# ", "", "Heading 1")
  const handleHeading2 = () => insertText("## ", "", "Heading 2")
  const handleList = () => insertText("- ", "", "List item")
  const handleOrderedList = () => insertText("1. ", "", "Numbered item")
  const handleQuote = () => insertText("> ", "", "Quote")
  const handleCode = () => insertText("`", "`", "code")
  const handleLink = () => insertText("[", "](url)", "link text")
  const handleImage = () => insertText("![", "](image-url)", "alt text")
  const handleTable = () => {
    const tableText = `
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Row 1    | Data     | Data     |
| Row 2    | Data     | Data     |
`
    insertText(tableText, "", "")
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

  const handleShare = async () => {
    try {
      // Create encrypted share payload
      const { payload, urlKey } = await createSharePayload(
        markdownContent,
        fileName,
        'text/markdown'
      );
      
      // Upload to IPFS
      const ipfsResult = await uploadToIPFS(
        new TextEncoder().encode(JSON.stringify(payload)),
        {
          fileName: `shared_document_${Date.now()}.json`,
          fileType: 'application/json',
          metadata: {
            type: 'shared-doc',
            version: '1.0'
          }
        }
      );
      
      return {
        ipfsHash: ipfsResult.IpfsHash,
        urlKey
      };
    } catch (error) {
      console.error('Share error:', error);
      throw error;
    }
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
              disabled={isNew || !markdownContent.trim()}
              title={isNew ? "Publish the file first to enable sharing" : !markdownContent.trim() ? "Cannot share empty file" : "Share file"}
              className="flex-1"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="flex-1 hidden">
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleBold} title="Bold">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleItalic} title="Italic">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleStrikethrough} title="Strikethrough">
              <Strikethrough className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleHeading1} title="Heading 1">
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleHeading2} title="Heading 2">
              <Heading2 className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleList} title="Bullet List">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleOrderedList} title="Numbered List">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleQuote} title="Quote">
              <Quote className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleCode} title="Inline Code">
              <Code className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleLink} title="Link">
              <Link className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleImage} title="Image">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleTable} title="Table">
              <Table className="h-4 w-4" />
            </Button>
          </div>

          {/* Editor Content Area */}
          <div className={`flex-1 flex ${isMobile ? "flex-col" : "flex-row"} overflow-hidden`}>
            {/* Markdown Editor */}
            <div className={`${isMobile ? "flex-1" : "w-1/2"} flex flex-col min-w-0`}>
              <div className="p-2 border-b bg-muted/10">
                <span className="text-xs font-medium text-muted-foreground">Markdown</span>
              </div>
              <Textarea
                ref={textareaRef}
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
                <div className="w-px bg-border flex-shrink-0" />
                <div className="w-1/2 flex flex-col min-w-0">
                  <div className="p-2 border-b bg-muted/10">
                    <span className="text-xs font-medium text-muted-foreground">Preview</span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-medium mb-2">{children}</h3>,
                        p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4 text-gray-600 dark:text-gray-400">
                            {children}
                          </blockquote>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className
                          if (isInline) {
                            return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                          }
                          return <code className={className}>{children}</code>
                        },
                        pre: ({ children }) => (
                          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4 text-sm">
                            {children}
                          </pre>
                        ),
                        a: ({ children, href }) => (
                          <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                        table: ({ children }) => (
                          <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 mb-4">
                            {children}
                          </table>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-left">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {markdownContent}
                    </ReactMarkdown>
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
        fileContent={markdownContent}
        onShare={handleShare}
      />
    </div>
  )
}
