"use client"

import { useState, useEffect } from "react"
import { FileList } from "@/components/file-list"
import { EditorPane } from "@/components/editor-pane"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { LayoutPanelLeft, Edit3, HelpCircle } from "lucide-react" // Removed Smartphone icon as it's no longer used
import { useMediaQuery } from "@/hooks/use-media-query"
import { useWallet } from "@/hooks/use-wallet"
import { useDocumentManager } from "@/hooks/use-document-manager"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { parseDocMemoData } from "@/lib/contract"

export interface FileData {
  id: string
  name: string
  content: string
  versions: FileVersion[]
  latestVersionTimestamp: string
  tokenId?: number
  ipfsHash?: string
  encryptionKey?: string
  nonce?: string
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
  const [files, setFiles] = useState<FileData[]>([])
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [isEditingNewFile, setIsEditingNewFile] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()
  
  // Use the real wallet hook
  const {
    isConnected: isWalletConnected,
    address: walletAddress,
    publicKey,
    isLoading: isWalletLoading,
    error: walletError,
    connectWallet,
    disconnectWallet,
    isMetaMaskInstalled
  } = useWallet()

  // Use the document manager hook
  const documentManager = useDocumentManager()

  // 加载用户的NFT文档
  const loadUserDocuments = async () => {
    if (!isWalletConnected || !walletAddress) {
      console.log('Cannot load documents: wallet not connected')
      return
    }

    if (documentManager.isAnyLoading) {
      console.log('Document manager is already loading, skipping...')
      return
    }

    console.log('[LOAD_USER_DOCS] Starting to load user documents...')
    setIsLoadingFiles(true)
    
    try {
      // 确保钱包状态稳定
      await new Promise(resolve => setTimeout(resolve, 50))
      
      console.log('[LOAD_USER_DOCS] Current files count before loading:', files.length)
      console.log('[LOAD_USER_DOCS] Current documentManager.userNFTs count:', documentManager.userNFTs.length)
      
            const loadedNFTs = await documentManager.loadUserNFTs()
       
       // 直接使用返回的NFTs而不是依赖状态
       const visibleNFTs = loadedNFTs.filter(nft => {
         const metadata = documentManager.getDocumentMetadataFromNFT(nft)
         return metadata.isVisible
       })
       
       console.log('[LOAD_USER_DOCS] After loadUserNFTs - total:', loadedNFTs.length, 'visible:', visibleNFTs.length)
       console.log('[LOAD_USER_DOCS] Visible NFT tokenIds:', visibleNFTs.map(n => n.tokenId))
      
             // 将NFT转换为FileData格式
       const fileDataList: FileData[] = visibleNFTs.map(nft => {
         const docMemoData = parseDocMemoData(nft.docMemo)
         const metadata = documentManager.getDocumentMetadataFromNFT(nft)
        
        // 获取版本信息
        let currentVersion = 1
        if (docMemoData && docMemoData.currentVersion) {
          // 新格式：有明确的当前版本号
          currentVersion = docMemoData.currentVersion
        } else if (docMemoData && docMemoData.versions && docMemoData.versions.length > 0) {
          // 新格式但缺少 currentVersion：使用最大版本号
          currentVersion = Math.max(...docMemoData.versions.map(v => v.versionId))
        }
        // 旧格式：保持默认值 1
        
        const fileName = metadata.fileName || `Document #${nft.tokenId}`
        
        // 添加版本号到文件名
        const fileNameWithVersion = fileName.includes(' (v') 
          ? fileName 
          : `${fileName.replace(/\.md$/, '')} (v${currentVersion}).md`
        
                 return {
          id: nft.tokenId.toString(),
          name: fileNameWithVersion,
          content: "", // 内容需要解密后才能获取
          latestVersionTimestamp: metadata.updatedAt || metadata.createdAt || nft.createdAt.toISOString(),
          versions: [{
            cid: nft.storageAddress,
            txHash: nft.docUID,
            timestamp: metadata.updatedAt || metadata.createdAt || nft.createdAt.toISOString(),
            content: ""
          }],
          tokenId: nft.tokenId,
          ipfsHash: nft.storageAddress
        }
      })
      
      console.log('[LOAD_USER_DOCS] Converted to FileData:', fileDataList.length, 'files')
      console.log('[LOAD_USER_DOCS] File names:', fileDataList.map(f => f.name))
      console.log('[LOAD_USER_DOCS] File tokenIds:', fileDataList.map(f => f.tokenId))
      
      setFiles(fileDataList)
      
      // 如果有文件且在桌面模式，选择第一个
      if (fileDataList.length > 0 && !isMobile && !selectedFile) {
        setSelectedFile(fileDataList[0])
      }
      
      console.log('[LOAD_USER_DOCS] Document loading completed:', fileDataList.length, 'files')
      console.log('[LOAD_USER_DOCS] Updated files state, hasInitialLoad -> true')
      setHasInitialLoad(true)
    } catch (error) {
      console.error('Failed to load documents:', error)
      
      // 更详细的错误信息
      let errorMessage = "Unknown error"
      if (error instanceof Error) {
        errorMessage = error.message
        if (error.message.includes('Cannot parse document information')) {
          errorMessage = "Some documents could not be loaded. Please try refreshing."
        }
      }
      
      toast({
        title: "Error loading documents",
        description: errorMessage,
        variant: "destructive"
      })
      
             // 不要清空文件列表，让用户保留已有的数据
       // setFiles([])
       
       // 即使失败也标记为已尝试加载，避免无限重试
       setHasInitialLoad(true)
     } finally {
       setIsLoadingFiles(false)
     }
  }

  // 当钱包连接状态改变时，加载文档
  useEffect(() => {
    let mounted = true

    const loadDocuments = async () => {
      if (isWalletConnected && walletAddress && !documentManager.isAnyLoading) {
        console.log('Loading documents - wallet connected:', isWalletConnected, 'address:', walletAddress)
        console.log('hasInitialLoad:', hasInitialLoad, 'files count:', files.length)
        
        // 如果已经有文件且不是初次加载，跳过
        if (hasInitialLoad && files.length > 0) {
          console.log('Skipping load - already have files and initial load completed')
          return
        }
        
        try {
          await loadUserDocuments()
        } catch (error) {
          console.error('Failed to load documents in useEffect:', error)
          if (mounted) {
            toast({
              title: "Failed to load documents",
              description: "Please try refreshing the page",
              variant: "destructive"
            })
          }
        }
      } else if (!isWalletConnected) {
        console.log('Wallet disconnected, clearing files')
        if (mounted) {
          setFiles([])
          setSelectedFile(null)
          setHasInitialLoad(false)
        }
      }
    }

    // 添加小延迟确保documentManager完全初始化
    const timeoutId = setTimeout(loadDocuments, 100)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [isWalletConnected, walletAddress, documentManager.isAnyLoading])

  // 监听 MetaMask 账户切换
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // 用户断开连接
          disconnectWallet()
        } else if (accounts[0] !== walletAddress) {
          // 用户切换了账户
          window.location.reload() // 简单地重新加载页面以重新初始化
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [walletAddress, disconnectWallet])

  const handleConnectWallet = async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const handleDisconnectWallet = () => {
    disconnectWallet()
    setSelectedFile(null)
  }

  const handleSelectFile = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setSelectedFile(file)
      setIsEditingNewFile(false)
      
      // 如果文件内容为空，尝试解密并加载内容
      if (!file.content && file.tokenId) {
        try {
          toast({
            title: "Loading document...",
            description: "Decrypting your document"
          })
          
          // 查找对应的NFT
          const nft = documentManager.userNFTs.find(n => n.tokenId === file.tokenId)
          if (nft) {
            // 解密文档内容
            const decryptResult = await documentManager.decryptDocumentFromNFT(nft)
            
            // 更新文件内容
            const updatedFile = {
              ...file,
              content: decryptResult.content
            }
            
            setSelectedFile(updatedFile)
            setFiles(prevFiles => 
              prevFiles.map(f => f.id === fileId ? updatedFile : f)
            )
            
            toast({
              title: "Document loaded",
              description: "Your document has been decrypted successfully"
            })
          }
        } catch (error) {
          console.error('Failed to decrypt document:', error)
          toast({
            title: "Failed to load document",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive"
          })
        }
      }
    }
  }

  const handleNewFile = () => {
    const defaultContent = `# New Document

Welcome to BlueDocs! This is your new encrypted Markdown document.

## Getting Started

Start writing your content here. Your document will be:

- 🔐 **Encrypted** locally in your browser
- 📦 **Stored** on IPFS (decentralized storage)
- 🔗 **Linked** to your wallet via NFT on Optimism blockchain

## Features

- **Privacy First**: Only you can decrypt your documents
- **Version Control**: Every update creates a new version
- **Decentralized**: No central server, your data is truly yours

---

Start typing to begin...`

    const newFile: FileData = {
      id: `new-${Date.now()}`,
      name: "Untitled.md",
      content: defaultContent,
      latestVersionTimestamp: new Date().toISOString(),
      versions: [{
        cid: "pending",
        txHash: "pending",
        timestamp: new Date().toISOString(),
        content: defaultContent,
      }],
    }
    setSelectedFile(newFile)
    setIsEditingNewFile(true)
  }

  // 重新加载当前选中文件的内容
  const handleReloadSelectedFile = async () => {
    if (!selectedFile || !selectedFile.tokenId) {
      console.log('No selected file or tokenId to reload')
      return
    }

    try {
      toast({
        title: "Reloading document...",
        description: "Fetching latest version"
      })

      // 先刷新 NFT 列表以获取最新的 docMemo
      await documentManager.loadUserNFTs()

      // 查找更新后的 NFT
      const nft = documentManager.userNFTs.find(n => n.tokenId === selectedFile.tokenId)
      if (nft) {
        // 解密最新的文档内容
        const decryptResult = await documentManager.decryptDocumentFromNFT(nft)
        
        // 更新文件内容和元数据
        const docMemoData = parseDocMemoData(nft.docMemo)
        const metadata = documentManager.getDocumentMetadataFromNFT(nft)
        
        // 获取当前版本号
        let currentVersion = 1
        if (docMemoData && docMemoData.currentVersion) {
          currentVersion = docMemoData.currentVersion
        } else if (docMemoData && docMemoData.versions && docMemoData.versions.length > 0) {
          currentVersion = Math.max(...docMemoData.versions.map(v => v.versionId))
        }
        
        const fileName = metadata.fileName || `Document #${nft.tokenId}`
        const fileNameWithVersion = fileName.includes(' (v') 
          ? fileName 
          : `${fileName.replace(/\.md$/, '')} (v${currentVersion}).md`
        
        const updatedFile = {
          ...selectedFile,
          name: fileNameWithVersion,
          content: decryptResult.content,
          latestVersionTimestamp: metadata.updatedAt || metadata.createdAt || nft.createdAt.toISOString()
        }
        
        setSelectedFile(updatedFile)
        setFiles(prevFiles => 
          prevFiles.map(f => f.id === selectedFile.id ? updatedFile : f)
        )
        
        toast({
          title: "Document reloaded",
          description: `Now viewing version ${currentVersion}`,
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Failed to reload document:', error)
      toast({
        title: "Failed to reload document",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    }
  }

  const handleUpdateFile = async (fileId: string, newName: string, newContent: string) => {
    const existingFile = files.find((f) => f.id === fileId)

    try {
      if (isEditingNewFile || !existingFile?.tokenId) {
        // 发布新文档
        toast({
          title: "Publishing document...",
          description: "Encrypting and uploading to IPFS"
        })

        const result = await documentManager.publishDocument(
          newContent,
          true, // 创建NFT
          newName
        )

        toast({
          title: "Document published!",
          description: `Document saved to IPFS: ${result.uploadResult.ipfsHash.substring(0, 8)}...`,
          variant: "default"
        })

        // publishDocument 内部已经刷新了 NFT 列表（包含延迟等待区块链同步）
        // 现在重新构建页面的文件列表
        console.log('[HANDLE_UPDATE_FILE] PublishDocument completed, now refreshing page file list')
        console.log('[HANDLE_UPDATE_FILE] Current files count before refresh:', files.length)
        
        setHasInitialLoad(false) // 重置初始化状态，允许重新加载
        await loadUserDocuments()
        
        console.log('[HANDLE_UPDATE_FILE] Page file list refresh completed, new count:', files.length)
        setIsEditingNewFile(false)
      } else {
        // 更新现有文档（添加新版本到同一个NFT）
        toast({
          title: "Updating document...",
          description: "Creating new version"
        })

        // 找到对应的NFT
        const nft = documentManager.userNFTs.find(n => n.tokenId === existingFile.tokenId)
        if (!nft) {
          throw new Error('NFT not found for this document')
        }

        // 使用新的版本控制功能更新文档
        await documentManager.updateDocument(nft, newContent, newName)

        toast({
          title: "Document updated!",
          description: "New version created successfully",
          variant: "default"
        })

        // 刷新文档列表
        setHasInitialLoad(false) // 重置初始化状态，允许重新加载
        await loadUserDocuments()
      }
    } catch (error) {
      console.error('Failed to save document:', error)
      toast({
        title: "Failed to save document",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    }
  }

  const renderDesktopLayout = () => (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-1/3 min-w-[250px] max-w-[350px] border-r p-4 overflow-y-auto">
        {isLoadingFiles ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading your documents...</p>
          </div>
        ) : (
          <FileList
            files={files}
            selectedFileId={selectedFile?.id}
            onSelectFile={handleSelectFile}
            onNewFile={handleNewFile}
            onRefresh={loadUserDocuments}
            isRefreshing={isLoadingFiles}
          />
        )}
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
            nft={selectedFile.tokenId ? documentManager.userNFTs.find(n => n.tokenId === selectedFile.tokenId) : null}
            onReloadFile={handleReloadSelectedFile}
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
          nft={selectedFile.tokenId ? documentManager.userNFTs.find(n => n.tokenId === selectedFile.tokenId) : null}
          onReloadFile={handleReloadSelectedFile}
        />
      ) : (
        <FileList 
          files={files} 
          selectedFileId={null} 
          onSelectFile={handleSelectFile} 
          onNewFile={handleNewFile}
          onRefresh={loadUserDocuments}
          isRefreshing={isLoadingFiles} 
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
          isLoading={isWalletLoading}
          error={walletError}
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
          {!isMetaMaskInstalled ? (
            <>
              <p className="text-lg mb-4 text-red-600">MetaMask is required to use this app.</p>
              <p className="mb-4">Please install MetaMask to manage your encrypted files.</p>
              <a 
                href="https://metamask.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Install MetaMask
              </a>
            </>
          ) : (
            <>
              <p className="text-lg mb-4">Please connect your wallet to manage your files.</p>
              <HelpCircle className="h-12 w-12 text-muted-foreground" />
            </>
          )}
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
