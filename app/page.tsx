"use client"

import { useState, useEffect } from "react"
import { FileList } from "@/components/file-list"
import { EditorPane } from "@/components/editor-pane"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { LayoutPanelLeft, Edit3, HelpCircle } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

export interface FileData {
  id: string
  name: string
  content: string
  versions: FileVersion[]
  latestVersionTimestamp: string
  isDeleted?: boolean
}

export interface FileVersion {
  cid: string
  txHash: string
  timestamp: string
  content: string
}

const mockFiles: FileData[] = [
  {
    id: "1",
    name: "My First Note.md",
    content: "# Hello World\n\nThis is my first encrypted note.",
    latestVersionTimestamp: "2024-06-22T10:00:00Z",
    versions: [
      {
        cid: "QmXyZ",
        txHash: "0xabc",
        timestamp: "2024-06-22T10:00:00Z",
        content: "# Hello World\n\nThis is my first encrypted note.",
      },
      { cid: "QmXyY", txHash: "0xdef", timestamp: "2024-06-21T14:30:00Z", content: "# Hello\n\nOld version." },
    ],
    isDeleted: false,
  },
  {
    id: "2",
    name: "Project Ideas.md",
    content: "## Brainstorming\n\n- Idea 1\n- Idea 2",
    latestVersionTimestamp: "2024-06-23T11:00:00Z",
    versions: [
      {
        cid: "QmZaB",
        txHash: "0x123",
        timestamp: "2024-06-23T11:00:00Z",
        content: "## Brainstorming\n\n- Idea 1\n- Idea 2",
      },
    ],
    isDeleted: false,
  },
  {
    id: "3",
    name: "Archived Thoughts.md",
    content: "Some old ideas.",
    latestVersionTimestamp: "2024-06-20T11:00:00Z",
    versions: [],
    isDeleted: true,
  },
]

export default function MarkdownManagerPage() {
  const [files, setFiles] = useState<FileData[]>(mockFiles)
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isEditingNewFile, setIsEditingNewFile] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (isWalletConnected && files.length > 0 && !isMobile) {
      const firstFile = files.find((f) => !f.isDeleted)
      setSelectedFile(firstFile || null)
    } else if (!isWalletConnected) {
      setSelectedFile(null)
    }
  }, [isWalletConnected, files, isMobile])

  const handleConnectWallet = () => {
    setIsWalletConnected(true)
    setWalletAddress("0x1234...abcd")
  }

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false)
    setWalletAddress(null)
    setSelectedFile(null)
  }

  const handleSelectFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setSelectedFile(file)
      setIsEditingNewFile(false)
    }
  }

  const handleNewFile = () => {
    const newFile: FileData = {
      id: String(Date.now()),
      name: "Untitled.md",
      content: "# New File\n\nStart writing...",
      latestVersionTimestamp: new Date().toISOString(),
      versions: [
        {
          cid: `QmNew${Date.now().toString().slice(-4)}`,
          txHash: "0xpending",
          timestamp: new Date().toISOString(),
          content: "# New File\n\nStart writing...",
        },
      ],
      isDeleted: false,
    }
    setFiles((prevFiles) => [newFile, ...prevFiles])
    setSelectedFile(newFile)
    setIsEditingNewFile(true)
  }

  const handleUpdateFile = (fileId: string, newName: string, newContent: string) => {
    const existingFile = files.find((f) => f.id === fileId)
    const currentTimestamp = new Date().toISOString()

    if (existingFile && !isEditingNewFile) {
      const newVersion: FileVersion = {
        cid: `QmUpd${Date.now().toString().slice(-4)}`,
        txHash: `0x${Math.random().toString(16).slice(2, 8)}`,
        timestamp: currentTimestamp,
        content: newContent,
      }
      const updatedFileData = {
        ...existingFile,
        name: newName,
        content: newContent,
        versions: [newVersion, ...existingFile.versions],
        latestVersionTimestamp: newVersion.timestamp,
      }
      setFiles(files.map((f) => (f.id === fileId ? updatedFileData : f)))
      setSelectedFile(updatedFileData)
    } else {
      const newFileData: FileData = {
        id: fileId,
        name: newName,
        content: newContent,
        latestVersionTimestamp: currentTimestamp,
        versions: [
          {
            cid: `QmSave${Date.now().toString().slice(-4)}`,
            txHash: `0x${Math.random().toString(16).slice(2, 8)}`,
            timestamp: currentTimestamp,
            content: newContent,
          },
        ],
        isDeleted: false,
      }
      setFiles((prevFiles) => [newFileData, ...prevFiles.filter((f) => f.id !== fileId)])
      setSelectedFile(newFileData)
      setIsEditingNewFile(false)
    }
  }

  const handleRefreshFiles = () => {
    toast.info("Refreshing file list...")
  }

  const handleDeleteFile = (fileId: string) => {
    setFiles((prevFiles) => prevFiles.map((file) => (file.id === fileId ? { ...file, isDeleted: true } : file)))

    if (selectedFile?.id === fileId) {
      const nextFile = files.find((f) => !f.isDeleted && f.id !== fileId)
      setSelectedFile(nextFile || null)
    }
    toast.success("File moved to trash.")
  }

  const renderDesktopLayout = () => (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-1/3 min-w-[250px] max-w-[350px] border-r p-4 overflow-y-auto">
        <FileList
          files={files}
          selectedFileId={selectedFile?.id}
          onSelectFile={handleSelectFile}
          onNewFile={handleNewFile}
          onRefresh={handleRefreshFiles}
          onDeleteFile={handleDeleteFile}
          isMobile={false}
        />
      </aside>
      <main className="flex-1 p-4 overflow-y-auto">
        {selectedFile ? (
          <EditorPane
            key={selectedFile.id}
            file={selectedFile}
            onUpdateFile={handleUpdateFile}
            isNew={isEditingNewFile}
            isMobile={false}
            onBack={() => {}} // Not used on desktop
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Edit3 className="h-16 w-16 mb-4" />
            <p>Select a file to view or edit, or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  )

  const renderMobileLayout = () => (
    <div className="flex-1 overflow-y-auto p-4">
      {selectedFile ? (
        <EditorPane
          key={selectedFile.id}
          file={selectedFile}
          onUpdateFile={handleUpdateFile}
          isNew={isEditingNewFile}
          isMobile={true}
          onBack={() => setSelectedFile(null)}
        />
      ) : (
        <FileList
          files={files}
          selectedFileId={null}
          onSelectFile={handleSelectFile}
          onNewFile={handleNewFile}
          onRefresh={handleRefreshFiles}
          onDeleteFile={handleDeleteFile}
          isMobile={true}
        />
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="h-6 w-6 text-primary" />
          <h1 className="text-lg md:text-xl font-semibold">Web3 Markdown Manager</h1>
        </div>
        <ConnectWalletButton
          isConnected={isWalletConnected}
          walletAddress={walletAddress}
          onConnect={handleConnectWallet}
          onDisconnect={handleDisconnectWallet}
        />
      </header>

      {isWalletConnected ? (
        isMobile ? (
          renderMobileLayout()
        ) : (
          renderDesktopLayout()
        )
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center p-4">
          <p className="text-lg mb-4">Please connect your wallet to manage your files.</p>
          <HelpCircle className="h-12 w-12 text-muted-foreground" />
          <div className="mt-8 max-w-md text-sm text-muted-foreground space-y-2 text-center">
            <p>My mind is mine — not yours (AI, Zuck, Elon, Sam… etc).</p>
            <p>What I share with my friends stays between us.</p>
            <p>No third parties. No platforms.</p>
            <p className="mt-3">No warranty. No guarantees.</p>
            <p>Verify me on GitHub — principles and code.</p>
          </div>
        </div>
      )}
      <footer className="p-3 border-t text-center text-xs md:text-sm text-muted-foreground">
        Optimism Blockchain & IPFS | Client-side Encryption | Version {new Date().getFullYear()}
      </footer>
      <Toaster />
    </div>
  )
}
