// 声明此组件为客户端组件，需要在浏览器中运行（因为需要状态管理和交互）
"use client";

// 导入 React 钩子：状态管理和副作用处理
import { useState, useEffect, useRef } from "react";
// 导入自定义组件：文件列表、编辑器面板、钱包连接按钮
import { FileList } from "@/components/file-list";
import { EditorPane } from "@/components/editor-pane";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
// 导入图标：布局面板、编辑器、帮助圆圈
import { LayoutPanelLeft, Edit3, HelpCircle } from "lucide-react";
// 导入自定义钩子：检测是否为移动设备
import { useMediaQuery } from "@/hooks/use-media-query";
// 导入 Toast 通知组件和方法
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useWallet, WalletProvider } from "@/components/wallet-provider"; // 导入钱包钩子
// 导入合约交互类
import { getDefaultContract, DocumentList } from "@/lib/contract";

import { encryptWithMetaMask, decryptWithMetaMask } from "@/lib/metamask-crypto"
import { uploadToIPFS, downloadFromIPFS } from "@/lib/ipfs"
import { encryptText, decryptData, type EncryptionResult } from "@/lib/encryption"

// 文件数据接口定义：描述单个文件的结构
export interface FileData {
  id: string; // 文件唯一标识符
  name: string; // 文件名称
  content: string; // 文件内容
  versions: FileVersion[]; // 文件版本历史记录
  latestVersionTimestamp: string; // 最新版本的时间戳
  isDeleted?: boolean; // 是否已删除（可选字段）
}

// 文件版本接口定义：描述文件版本的结构
export interface FileVersion {
  cid: string; // IPFS 内容标识符（Content Identifier）
  txHash: string; // 区块链交易哈希
  timestamp: string; // 版本创建时间戳
  content: string; // 该版本的文件内容
}

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
    isMetaMaskInstalled,
  } = useWallet();

  // 状态管理：文件列表数据
  const [files, setFiles] = useState<FileData[]>([]);
  // 状态管理：当前选中的文件
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  // 状态管理：钱包连接状态
  //const [isWalletConnected, setIsWalletConnected] = useState(false)
  // 状态管理：钱包地址
  //const [walletAddress, setWalletAddress] = useState<string | null>(null)
  // 状态管理：是否正在编辑新文件
  const [isEditingNewFile, setIsEditingNewFile] = useState(false);
  // 状态管理：用户的NFT信息
  const [userNFTs, setUserNFTs] = useState<DocumentList[]>([]);
  // 状态管理：用户的Token ID列表
  const [userTokenIds, setUserTokenIds] = useState<bigint[]>([]);
  // 状态管理：是否正在加载NFT
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  // 状态管理：原始文档元数据（用于解密）
  const [originalDocumentMetadata, setOriginalDocumentMetadata] = useState<any[]>([]);
  // 状态管理：是否正在解密文件
  const [isDecryptingFile, setIsDecryptingFile] = useState(false);
  // 响应式设计：检测是否为移动设备（屏幕宽度小于768px）
  const isMobile = useMediaQuery("(max-width: 768px)");

  // 在 app/page.tsx 中
  const prevAddress = useRef<string | null>(null);

  // 将文档元数据转换为 FileData 格式的函数（仅创建列表项，不解密内容）
  const convertDocumentMetadataToFileData = (documentMetadata: any[]): FileData[] => {
    const fileDataArray: FileData[] = [];
    
    for (const doc of documentMetadata) {
      // 创建 FileData 对象，只包含基本信息，不解密内容
      const fileData: FileData = {
        id: doc.uid,
        name: doc.metadata.title || doc.fileName || "Untitled.md",
        content: "", // 暂时为空，点击时再解密
        latestVersionTimestamp: doc.metadata.uploadedAt,
        versions: [
          {
            cid: doc.ipfsResult.ipfsHash,
            txHash: "0x" + Math.random().toString(16).slice(2, 10), // 临时交易哈希
            timestamp: doc.metadata.uploadedAt,
            content: "", // 暂时为空
          },
        ],
        isDeleted: false,
      };
      
      fileDataArray.push(fileData);
    }
    
    return fileDataArray;
  };

  // 解密单个文件内容的函数
  const decryptSingleFile = async (fileId: string): Promise<string> => {
    if (!walletAddress) {
      throw new Error("钱包未连接");
    }

    // 找到对应的文档元数据
    const docMetadata = originalDocumentMetadata.find(doc => doc.uid === fileId);
    if (!docMetadata) {
      throw new Error("找不到文档元数据");
    }

    if (!docMetadata.encryptionInfo?.metamaskEncryptedKeys) {
      throw new Error("文档缺少加密密钥信息");
    }

    try {
      // 解密 MetaMask 加密的密钥数据
      const decryptedKeys = await decryptWithMetaMask(
        docMetadata.encryptionInfo.metamaskEncryptedKeys,
        walletAddress
      );
      
      const keyData = JSON.parse(decryptedKeys);
      
      // 从 IPFS 下载加密的文档内容
      const encryptedContent = await downloadFromIPFS(docMetadata.ipfsResult.ipfsHash);
      
      // 使用解密后的密钥解密文档内容
      const decryptedContent = decryptData(
        encryptedContent,
        keyData.encryptionKey,
        keyData.nonce
      );
      
      return decryptedContent;
    } catch (error) {
      console.error(`解密文档 ${fileId} 失败:`, error);
      throw error;
    }
  };

  // 获取用户NFT信息的函数
  const fetchUserNFTs = async (address: string) => {
    try {
      setIsLoadingNFTs(true);
      console.log("开始获取用户NFT信息...", address);
      
      // 获取合约实例
      const contract = getDefaultContract();
      await contract.init();
      
      // 获取用户的Token ID列表
      const tokenIds = await contract.getUserTokenIds(address);
      console.log("用户Token ID列表:", tokenIds.map(id => id.toString()));
      setUserTokenIds(tokenIds);
      
      // 获取用户的文档列表
      const documentLists = await contract.getUserDocumentLists(address);
      console.log("用户文档列表:", documentLists.length > 0 ? documentLists[0].DocumentListTokenId : "无");
      setUserNFTs(documentLists);
      
      // 解密 MetaMask 加密的密钥数据
      if (documentLists.length > 0 && documentLists[0].encryptedMemo) {
        try {
          const decryptedMemo = await decryptWithMetaMask(
            documentLists[0].encryptedMemo,
            address
          );
          
          const keyData = JSON.parse(decryptedMemo);
          console.log("解密后的密钥数据:", keyData);
          
          // 从 IPFS 下载加密的文档集合
          const encryptedCollection = await downloadFromIPFS(documentLists[0].ipfsHash);
          
          // 使用解密后的密钥解密文档集合
          const decryptedCollection = decryptData(
            encryptedCollection,
            keyData.encryptionKey,
            keyData.nonce
          );
          console.log("解密后的文档集合:", decryptedCollection);
          
          // 解析文档集合并转换为 FileData 格式
          const parsedFiles = JSON.parse(decryptedCollection);
          console.log("成功解密并加载文档集合:", parsedFiles);
          
          // 保存原始文档元数据（用于后续解密）
          setOriginalDocumentMetadata(parsedFiles);
          
          // 将文档元数据转换为 FileData 格式（仅创建列表项）
          const convertedFiles = convertDocumentMetadataToFileData(parsedFiles);
          console.log("转换后的文件数据:", convertedFiles);
          
          // 设置文件列表
          setFiles(convertedFiles);
          
        } catch (decryptError) {
          console.error("解密文档集合失败:", decryptError);
          toast.error("解密文档集合失败", {
            description: decryptError instanceof Error ? decryptError.message : "解密失败"
          });
        }
      }

      // 显示成功提示
      toast.success(`Account file list retrieved`, {
        description: `The list has been successfully loaded.`
      });
      
    } catch (error) {
      console.error("Account file list error", error);
      toast.error("Account file list error", {
        description: error instanceof Error ? error.message : "未知错误"
      });
      setUserNFTs([]);
      setUserTokenIds([]);
      setOriginalDocumentMetadata([]);
    } finally {
      setIsLoadingNFTs(false);
    }
  };

  //当钱包连接状态发生变化时，更新文件列表，也是核心的文件列表加载逻辑。
  useEffect(() => {
    const currentAddress = walletAddress;
    const previousAddress = prevAddress.current;

    if (currentAddress && !previousAddress) {
      // 场景1：从未连接到已连接
      console.log("钱包连接:", currentAddress);
      // 获取用户的NFT信息
      fetchUserNFTs(currentAddress);
    } else if (!currentAddress && previousAddress) {
      // 场景3：断开连接
      console.log("❌ 钱包断开连接:", previousAddress);
      setFiles([]);
      setSelectedFile(null);
      setUserNFTs([]);
      setUserTokenIds([]);
      setOriginalDocumentMetadata([]);
    }

    prevAddress.current = currentAddress;
  }, [walletAddress]);

  // 副作用钩子：当钱包连接状态或文件列表变化时，自动选择第一个文件
  /*
  useEffect(() => {
    // 如果钱包已连接、有文件且不是移动设备，自动选择第一个未删除的文件
    if (isWalletConnected && files.length > 0 && !isMobile) {
      const firstFile = files.find((f) => !f.isDeleted);
      setSelectedFile(firstFile || null);
    } else if (!isWalletConnected) {
      // 如果钱包断开连接，清除选中的文件
      setSelectedFile(null);
    }
  }, [isWalletConnected, files, isMobile]);
*/
  // 事件处理函数：连接钱包
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // 事件处理函数：断开钱包连接
  const handleDisconnectWallet = () => {
    disconnectWallet();
    setSelectedFile(null);
    setOriginalDocumentMetadata([]);
  };

  // 事件处理函数：选择文件
  const handleSelectFile = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    // 如果文件内容已经解密，直接选择
    if (file.content) {
      setSelectedFile(file);
      setIsEditingNewFile(false);
      return;
    }

    // 如果文件内容为空，需要解密
    setIsDecryptingFile(true);
    try {
      toast.loading("正在解密文件内容...", { id: "decrypt-file" });
      
      const decryptedContent = await decryptSingleFile(fileId);
      
      // 更新文件内容
      const updatedFile = {
        ...file,
        content: decryptedContent,
        versions: file.versions.map((v, index) => 
          index === 0 ? { ...v, content: decryptedContent } : v
        )
      };
      
      // 更新文件列表
      setFiles(prevFiles => 
        prevFiles.map(f => f.id === fileId ? updatedFile : f)
      );
      
      // 选择更新后的文件
      setSelectedFile(updatedFile);
      setIsEditingNewFile(false);
      
      toast.success("文件解密成功！", { id: "decrypt-file" });
      
    } catch (error) {
      console.error("解密文件失败:", error);
      toast.error("解密文件失败", { 
        id: "decrypt-file",
        description: error instanceof Error ? error.message : "解密失败"
      });
    } finally {
      setIsDecryptingFile(false);
    }
  };

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
          cid: `QmNew${Date.now().toString().slice(-4)}`, // 生成模拟的 IPFS CID
          txHash: "0xpending", // 待处理的交易哈希
          timestamp: new Date().toISOString(),
          content: "# New File\n\nStart writing...",
        },
      ],
      isDeleted: false,
    };
    // 将新文件添加到文件列表开头
    setFiles((prevFiles) => [newFile, ...prevFiles]);
    setSelectedFile(newFile); // 选中新创建的文件
    setIsEditingNewFile(true); // 进入新文件编辑模式
  };

  // 事件处理函数：更新文件内容
  const handleUpdateFile = (
    fileId: string,
    newName: string,
    newContent: string
  ) => {
    const existingFile = files.find((f) => f.id === fileId);
    const currentTimestamp = new Date().toISOString();

    // 如果文件已存在且不是新文件编辑模式，创建新版本
    if (existingFile && !isEditingNewFile) {
      // 创建新版本对象
      const newVersion: FileVersion = {
        cid: `QmUpd${Date.now().toString().slice(-4)}`, // 生成更新版本的 CID
        txHash: `0x${Math.random().toString(16).slice(2, 8)}`, // 生成随机交易哈希
        timestamp: currentTimestamp,
        content: newContent,
      };
      // 更新文件数据，将新版本添加到版本历史开头
      const updatedFileData = {
        ...existingFile,
        name: newName,
        content: newContent,
        versions: [newVersion, ...existingFile.versions],
        latestVersionTimestamp: newVersion.timestamp,
      };
      setFiles(files.map((f) => (f.id === fileId ? updatedFileData : f)));
      setSelectedFile(updatedFileData);
    } else {
      // 如果是新文件或编辑新文件，创建完整的文件对象
      const newFileData: FileData = {
        id: fileId,
        name: newName,
        content: newContent,
        latestVersionTimestamp: currentTimestamp,
        versions: [
          {
            cid: `QmSave${Date.now().toString().slice(-4)}`, // 生成保存版本的 CID
            txHash: `0x${Math.random().toString(16).slice(2, 8)}`, // 生成随机交易哈希
            timestamp: currentTimestamp,
            content: newContent,
          },
        ],
        isDeleted: false,
      };
      // 替换或添加文件到列表
      setFiles((prevFiles) => [
        newFileData,
        ...prevFiles.filter((f) => f.id !== fileId),
      ]);
      setSelectedFile(newFileData);
      setIsEditingNewFile(false); // 退出新文件编辑模式
    }
  };

  // 事件处理函数：刷新文件列表
  const handleRefreshFiles = () => {
    toast.info("Refreshing file list..."); // 显示刷新提示
  };

  // 事件处理函数：删除文件（软删除）
  const handleDeleteFile = (fileId: string) => {
    // 将文件标记为已删除，而不是从数组中移除
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, isDeleted: true } : file
      )
    );

    // 如果删除的是当前选中的文件，选择下一个未删除的文件
    if (selectedFile?.id === fileId) {
      const nextFile = files.find((f) => !f.isDeleted && f.id !== fileId);
      setSelectedFile(nextFile || null);
    }
    toast.success("File moved to trash."); // 显示删除成功提示
  };

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
  );

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
          onBack={() => setSelectedFile(null)} // 移动端可以返回文件列表
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
  );

  // 主组件渲染：返回完整的页面结构
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* 页面头部：标题和钱包连接按钮 */}
      <header className="flex items-center justify-between p-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="h-6 w-6 text-primary" />
          <h1 className="text-lg md:text-xl font-semibold">
            Web3 Markdown Manager
          </h1>
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
          renderMobileLayout() // 移动端布局
        ) : (
          renderDesktopLayout() // 桌面端布局
        )
      ) : (
        // 钱包未连接：显示连接提示和应用介绍
        <div className="flex flex-1 flex-col items-center justify-center text-center p-4">
          <p className="text-lg mb-4">
            Please connect your wallet to manage your files.
          </p>
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
        Optimism Blockchain & IPFS | Client-side Encryption | Version{" "}
        {new Date().getFullYear()}
      </footer>
      {/* Toast 通知组件 */}
      <Toaster />
    </div>
  );
}
