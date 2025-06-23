"use client"

import { useState, useEffect } from "react"
import { FileList } from "@/components/file-list"
import { EditorPane } from "@/components/editor-pane"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { LayoutPanelLeft, Edit3, HelpCircle } from "lucide-react"

export interface FileData {
  id: string
  name: string
  content: string
  versions: FileVersion[]
  latestVersionTimestamp: string
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
  },
]

export default function MarkdownManagerPage() {
  const [files, setFiles] = useState<FileData[]>(mockFiles)
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  // Add new state for tracking if the editor is for a new file
  const [isEditingNewFile, setIsEditingNewFile] = useState(false)

  useEffect(() => {
    if (isWalletConnected && files.length > 0) {
      setSelectedFile(files[0])
    } else if (!isWalletConnected) {
      setSelectedFile(null)
    }
  }, [isWalletConnected, files])

  const handleConnectWallet = () => {
    setIsWalletConnected(true)
    setWalletAddress("0x1234...abcd") // Mock address
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
      setIsEditingNewFile(false) // Existing file selected
    }
  }

  const handleNewFile = () => {
    const newFile: FileData = {
      id: String(Date.now()), // Temporary ID for a new file
      name: "Untitled.md",
      content: "# New File\n\nStart writing...",
      latestVersionTimestamp: new Date().toISOString(),
      versions: [
        {
          cid: `QmNew${Date.now().toString().slice(-4)}`, // Placeholder CID
          txHash: "0xpending", // Placeholder TxHash
          timestamp: new Date().toISOString(),
          content: "# New File\n\nStart writing...",
        },
      ],
    }
    setSelectedFile(newFile)
    setIsEditingNewFile(true) // New file is being edited
  }

  const handleUpdateFile = (fileId: string, newName: string, newContent: string) => {
    const existingFile = files.find((f) => f.id === fileId)
    const currentTimestamp = new Date().toISOString()

    if (existingFile) {
      // Updating an existing file
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
      // isEditingNewFile remains false
    } else {
      // Saving a new file for the first time (publishing)
      const newFileData: FileData = {
        id: fileId, // Use the ID from the new file object (was temporary)
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
      }
      setFiles((prevFiles) => [newFileData, ...prevFiles.filter((f) => f.id !== fileId)]) // Add new file, remove any temp with same ID if logic allows
      setSelectedFile(newFileData)
      setIsEditingNewFile(false) // File is now published, no longer "new" in editor context
    }
    // alert('File action complete (mocked)');
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Web3 Markdown Manager</h1>
        </div>
        <ConnectWalletButton
          isConnected={isWalletConnected}
          walletAddress={walletAddress}
          onConnect={handleConnectWallet}
          onDisconnect={handleDisconnectWallet}
        />
      </header>

      {isWalletConnected ? (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-1/4 min-w-[250px] max-w-[350px] border-r p-4 overflow-y-auto">
            <FileList
              files={files}
              selectedFileId={selectedFile?.id}
              onSelectFile={handleSelectFile}
              onNewFile={handleNewFile}
            />
          </aside>
          <main className="flex-1 p-4 overflow-y-auto">
            {selectedFile ? (
              <EditorPane
                key={selectedFile.id}
                file={selectedFile}
                onUpdateFile={handleUpdateFile}
                isNew={isEditingNewFile} // Pass the new prop
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Edit3 className="h-16 w-16 mb-4" />
                <p>Select a file to view or edit, or create a new one.</p>
              </div>
            )}
          </main>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-lg mb-4">Please connect your wallet to manage your files.</p>
          <HelpCircle className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      <footer className="p-3 border-t text-center text-sm text-muted-foreground">
        Optimism Blockchain & IPFS | Client-side Encryption | Version {new Date().getFullYear()}
      </footer>
    </div>
  )
}
