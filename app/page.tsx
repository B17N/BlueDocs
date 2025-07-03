// 声明此组件为客户端组件，需要在浏览器中运行（因为需要状态管理和交互）
"use client"

// 导入 React 钩子：状态管理和副作用处理
import { useState, useEffect } from "react"
// 导入自定义组件：文件列表、编辑器面板、钱包连接按钮
import { FileList } from "@/components/file-list"
import { EditorPane } from "@/components/editor-pane"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
// 导入图标：布局面板、编辑器、帮助圆圈
import { LayoutPanelLeft, Edit3, HelpCircle } from "lucide-react"
// 导入自定义钩子：检测是否为移动设备
import { useMediaQuery } from "@/hooks/use-media-query"
// 导入 Toast 通知组件和方法
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { useWallet, WalletProvider } from "@/components/wallet-provider" // 导入钱包钩子

 
// 文件数据接口定义：描述单个文件的结构
export interface FileData {
  id: string                        // 文件唯一标识符
  name: string                      // 文件名称
  content: string                   // 文件内容
  versions: FileVersion[]           // 文件版本历史记录
  latestVersionTimestamp: string    // 最新版本的时间戳
  isDeleted?: boolean              // 是否已删除（可选字段）
}

// 文件版本接口定义：描述文件版本的结构
export interface FileVersion {
  cid: string         // IPFS 内容标识符（Content Identifier）
  txHash: string      // 区块链交易哈希
  timestamp: string   // 版本创建时间戳
  content: string     // 该版本的文件内容
}

// 模拟文件数据：用于演示和测试的示例文件
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

// 主组件：Markdown 管理器页面
export default function MarkdownManagerPage() {
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
  
  // 状态管理：文件列表数据
  const [files, setFiles] = useState<FileData[]>(mockFiles)
  // 状态管理：当前选中的文件
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  // 状态管理：钱包连接状态
  //const [isWalletConnected, setIsWalletConnected] = useState(false)
  // 状态管理：钱包地址
  //const [walletAddress, setWalletAddress] = useState<string | null>(null)
  // 状态管理：是否正在编辑新文件
  const [isEditingNewFile, setIsEditingNewFile] = useState(false)
  // 响应式设计：检测是否为移动设备（屏幕宽度小于768px）
  const isMobile = useMediaQuery("(max-width: 768px)")

  // 副作用钩子：当钱包连接状态或文件列表变化时，自动选择第一个文件
  useEffect(() => {
    // 如果钱包已连接、有文件且不是移动设备，自动选择第一个未删除的文件
    if (isWalletConnected && files.length > 0 && !isMobile) {
      const firstFile = files.find((f) => !f.isDeleted)
      setSelectedFile(firstFile || null)
    } else if (!isWalletConnected) {
      // 如果钱包断开连接，清除选中的文件
      setSelectedFile(null)
    }
  }, [isWalletConnected, files, isMobile])

  // 事件处理函数：连接钱包
  const handleConnectWallet = async() => {
    try {
      await connectWallet()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } // 模拟钱包地址
  }

  // 事件处理函数：断开钱包连接
  const handleDisconnectWallet = () => {
    
    disconnectWallet()
    setSelectedFile(null)

  }

  // 事件处理函数：选择文件
  const handleSelectFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setSelectedFile(file)
      setIsEditingNewFile(false)  // 不再是新文件编辑模式
    }
  }

  // 事件处理函数：创建新文件
  const handleNewFile = () => {
    // 创建新文件对象，使用当前时间戳作为 ID
    const newFile: FileData = {
      id: String(Date.now()),
      name: "Untitled.md",
      content: "# New File\n\nStart writing...",
      latestVersionTimestamp: new Date().toISOString(),
      versions: [
        {
          cid: `QmNew${Date.now().toString().slice(-4)}`,  // 生成模拟的 IPFS CID
          txHash: "0xpending",  // 待处理的交易哈希
          timestamp: new Date().toISOString(),
          content: "# New File\n\nStart writing...",
        },
      ],
      isDeleted: false,
    }
    // 将新文件添加到文件列表开头
    setFiles((prevFiles) => [newFile, ...prevFiles])
    setSelectedFile(newFile)  // 选中新创建的文件
    setIsEditingNewFile(true)  // 进入新文件编辑模式
  }

  // 事件处理函数：更新文件内容
  const handleUpdateFile = (fileId: string, newName: string, newContent: string) => {
    const existingFile = files.find((f) => f.id === fileId)
    const currentTimestamp = new Date().toISOString()

    // 如果文件已存在且不是新文件编辑模式，创建新版本
    if (existingFile && !isEditingNewFile) {
      // 创建新版本对象
      const newVersion: FileVersion = {
        cid: `QmUpd${Date.now().toString().slice(-4)}`,  // 生成更新版本的 CID
        txHash: `0x${Math.random().toString(16).slice(2, 8)}`,  // 生成随机交易哈希
        timestamp: currentTimestamp,
        content: newContent,
      }
      // 更新文件数据，将新版本添加到版本历史开头
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
      // 如果是新文件或编辑新文件，创建完整的文件对象
      const newFileData: FileData = {
        id: fileId,
        name: newName,
        content: newContent,
        latestVersionTimestamp: currentTimestamp,
        versions: [
          {
            cid: `QmSave${Date.now().toString().slice(-4)}`,  // 生成保存版本的 CID
            txHash: `0x${Math.random().toString(16).slice(2, 8)}`,  // 生成随机交易哈希
            timestamp: currentTimestamp,
            content: newContent,
          },
        ],
        isDeleted: false,
      }
      // 替换或添加文件到列表
      setFiles((prevFiles) => [newFileData, ...prevFiles.filter((f) => f.id !== fileId)])
      setSelectedFile(newFileData)
      setIsEditingNewFile(false)  // 退出新文件编辑模式
    }
  }

  // 事件处理函数：刷新文件列表
  const handleRefreshFiles = () => {
    toast.info("Refreshing file list...")  // 显示刷新提示
  }

  // 事件处理函数：删除文件（软删除）
  const handleDeleteFile = (fileId: string) => {
    // 将文件标记为已删除，而不是从数组中移除
    setFiles((prevFiles) => prevFiles.map((file) => (file.id === fileId ? { ...file, isDeleted: true } : file)))

    // 如果删除的是当前选中的文件，选择下一个未删除的文件
    if (selectedFile?.id === fileId) {
      const nextFile = files.find((f) => !f.isDeleted && f.id !== fileId)
      setSelectedFile(nextFile || null)
    }
    toast.success("File moved to trash.")  // 显示删除成功提示
  }

  // 渲染函数：桌面端布局（左侧文件列表 + 右侧编辑器）
  const renderDesktopLayout = () => (
    <div className="flex flex-1 overflow-hidden">
      {/* 左侧边栏：文件列表 */}
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
      {/* 主内容区：编辑器或空状态 */}
      <main className="flex-1 p-4 overflow-y-auto">
        {selectedFile ? (
          // 如果有选中文件，显示编辑器
          <EditorPane
            key={selectedFile.id}
            file={selectedFile}
            onUpdateFile={handleUpdateFile}
            isNew={isEditingNewFile}
            isMobile={false}
            onBack={() => {}} // 桌面端不需要返回功能
          />
        ) : (
          // 如果没有选中文件，显示空状态提示
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Edit3 className="h-16 w-16 mb-4" />
            <p>Select a file to view or edit, or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  )

  // 渲染函数：移动端布局（单页面显示文件列表或编辑器）
  const renderMobileLayout = () => (
    <div className="flex-1 overflow-y-auto p-4">
      {selectedFile ? (
        // 如果有选中文件，显示编辑器（带返回功能）
        <EditorPane
          key={selectedFile.id}
          file={selectedFile}
          onUpdateFile={handleUpdateFile}
          isNew={isEditingNewFile}
          isMobile={true}
          onBack={() => setSelectedFile(null)}  // 移动端可以返回文件列表
        />
      ) : (
        // 如果没有选中文件，显示文件列表
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

  // 主组件渲染：返回完整的页面结构
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* 页面头部：标题和钱包连接按钮 */}
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

      {/* 主内容区：根据钱包连接状态和设备类型显示不同内容 */}
      {isWalletConnected ? (
        // 钱包已连接：根据设备类型显示相应布局
        isMobile ? (
          renderMobileLayout()    // 移动端布局
        ) : (
          renderDesktopLayout()   // 桌面端布局
        )
      ) : (
        // 钱包未连接：显示连接提示和应用介绍
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
      {/* 页面底部：技术信息 */}
      <footer className="p-3 border-t text-center text-xs md:text-sm text-muted-foreground">
        Optimism Blockchain & IPFS | Client-side Encryption | Version {new Date().getFullYear()}
      </footer>
      {/* Toast 通知组件 */}
      <Toaster />
    </div>
  )
}
