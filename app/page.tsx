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
  isNewClientSide: boolean; // 是否是客户端新建的文件
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
  // 状态管理：是否正在处理文件（发布或更新）
  const [isProcessing, setIsProcessing] = useState(false);
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
        isNewClientSide: false,
        latestVersionTimestamp: doc.metadata.uploadedAt,
        versions: [
          {
            cid: doc.ipfsResult.ipfsHash,
            txHash: "0x" + Math.random().toString(16).slice(2, 10), // 临时交易哈希
            timestamp: doc.metadata.uploadedAt,
            content: "", // 暂时为空
          },
        ],
        isDeleted: doc.isDeleted || false, // 从文档元数据中读取 isDeleted 状态
      };
      
      fileDataArray.push(fileData);
    }
    
    return fileDataArray;
  };

  // 解密单个文件内容的函数
  const decryptSingleFile = async (fileId: string): Promise<string> => {
    if (!walletAddress) {
      throw new Error("Wallet not connected");
    }

    // 找到对应的文档元数据
    const docMetadata = originalDocumentMetadata.find(doc => doc.uid === fileId);
    if (!docMetadata) {
      throw new Error("Document metadata not found");
    }

    if (!docMetadata.encryptionInfo?.metamaskEncryptedKeys) {
      throw new Error("Document missing encryption key information");
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
          toast.error("Failed to decrypt document collection:", {
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
        description: error instanceof Error ? error.message : "Unknown error"
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
    // 检查是否正在处理文件
    if (isProcessing) {
      alert("Please wait for the current file processing to complete before selecting a file.");
      return;
    }

    // 检查是否有未保存的新文件
    if (isEditingNewFile) {
      const shouldContinue = window.confirm(
        "You have an unsaved new file. If you continue creating a new file, the changes in the current file will be lost. Do you want to continue?"
      );
      if (!shouldContinue) {
        return;
      }else{
      // 从文件列表中移除新文件
      setFiles(prevFiles => prevFiles.filter(f => !f.isNewClientSide));
      setIsEditingNewFile(false);
      }
    }
    
    // 如果有新文件且未保存，清除新文件状态


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
      toast.loading("Decrypting file content…", { id: "decrypt-file" });
      
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
      
      toast.success("File decrypted successfully!", { id: "decrypt-file" });
      
    } catch (error) {
      console.error("解密文件失败:", error);
      toast.error("Failed to decrypt file", { 
        id: "decrypt-file",
        description: error instanceof Error ? error.message : "Decryption failed"
      });
    } finally {
      setIsDecryptingFile(false);
    }
  };

  // 事件处理函数：创建新文件
  const handleNewFile = () => {
    // 检查是否正在处理文件
    if (isProcessing) {
      alert("Please wait for the current file processing to complete before creating a new file.");
      return;
    }

    // 检查是否已经有未保存的新文件
    if (isEditingNewFile) {
      const shouldContinue = window.confirm(
        "You have an unsaved new file. If you continue creating a new file, the changes in the current file will be lost. Do you want to continue?"
      );
      if (!shouldContinue) {
        return;
      }
    }
    
    // 创建新文件对象，使用当前时间戳作为 ID
    const newFile: FileData = {
      id: String(Date.now()),
      name: "Untitled.md",
      content: "# New File\n\nStart writing...",
      isNewClientSide: true,
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
    // 直接选中新文件，不添加到文件列表中
    setSelectedFile(newFile);
    setIsEditingNewFile(true); // 进入新文件编辑模式
    
  };

  // 事件处理函数：更新文件内容
  const handleUpdateFile = async (
    fileId: string,
    newName: string,
    newContent: string
  ) => {
    const existingFile = files.find((f) => f.id === fileId);
    const currentTimestamp = new Date().toISOString();

    // 设置处理状态
    setIsProcessing(true);

    // 只处理新文件发布
    if (isEditingNewFile && selectedFile?.id === fileId) {
      try {
        // 前置检查
        if (!isWalletConnected || !walletAddress) {
          toast.error("Please connect your wallet first");
          return;
        }

        if (!publicKey) {
          toast.error("Unable to get wallet public key, please reconnect your wallet");
          return;
        }

        if (!newContent.trim()) {
          toast.error("File content cannot be empty");
          return;
        }

        if (!newName.trim()) {
          toast.error("File name cannot be empty");
          return;
        }

        // 显示开始处理的提示
        toast.loading("Processing file publication...", { id: "publish-progress" });

        // 步骤1：加密单个文件内容
        console.log("=== 步骤1-开始加密文件内容 ===");
        toast.loading("Encrypting file content...", { id: "publish-progress" });
        
        const encryptionResult = encryptText(newContent);

        console.log("加密结果:", encryptionResult.encryptedData);

        // 步骤2：上传单个文件到 IPFS
        console.log("=== 步骤2：开始上传文件到 IPFS ===");
        toast.loading("Uploading file to IPFS...", { id: "publish-progress" });
        const ipfsFileName = `encrypted_document_${Date.now()}.bin`;
        const ipfsResult = await uploadToIPFS(encryptionResult.encryptedData, {
          fileName: ipfsFileName,
          fileType: "application/octet-stream",
          metadata: {
            uploadedAt: currentTimestamp,
            encrypted: "true",
            walletAddress: walletAddress,
            source: "BlueDoku_DocumentEditor"
          }
        });

        const keyData = {
          encryptionKey: encryptionResult.key,
          nonce: encryptionResult.nonce,
          ipfsHash: ipfsResult.IpfsHash,
          timestamp: ipfsResult.Timestamp
        };
        const encryptedKeyData = await encryptWithMetaMask(
          JSON.stringify(keyData),
          publicKey
        );

        // 步骤4：创建文件元数据
        console.log("=== 步骤4：创建文件元数据 ===");
        toast.loading("Creating file metadata...", { id: "publish-progress" });

        const uid = crypto.randomUUID();
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsResult.IpfsHash}`;

        const documentMetadata = {
          uid: uid,
          fileName: ipfsFileName,
          fileType: "application/octet-stream",
          metadata: {
            uploadedAt: currentTimestamp,        
            encrypted: "true",
            title: newName
          },
          ipfsResult: {
            ipfsHash: ipfsResult.IpfsHash,
            gatewayUrl: gatewayUrl,
            pinSize: ipfsResult.PinSize,
            timestamp: ipfsResult.Timestamp
          },
          encryptionInfo: {
            metamaskEncryptedKeys: encryptedKeyData
          }
        };

        console.log("=== 创建的文件元数据 ===");
        console.log(JSON.stringify(documentMetadata, null, 2));

        // 步骤5：添加到文档集合
        console.log("=== 步骤5：添加到文档集合 ===");
       
        // 更新原始文档元数据
        const updatedOriginalMetadata = [...originalDocumentMetadata, documentMetadata];
        setOriginalDocumentMetadata(updatedOriginalMetadata);
        console.log("=== 原始文档元数据集合 ===");
        console.log(JSON.stringify(updatedOriginalMetadata, null, 2));

        // 步骤6：加密整个文档集合
        console.log("=== 步骤6：开始加密文档集合 ===");
        toast.loading("Encrypting document collection...", { id: "publish-progress" });

        const collectionJSON = JSON.stringify(updatedOriginalMetadata);
        const collectionEncryptionResult = encryptText(collectionJSON);
        console.log("文档集合加密结果:", {
          originalSize: collectionJSON.length,
          encryptedSize: collectionEncryptionResult.encryptedData.length
        });

        // 步骤7：上传加密的文档集合到 IPFS
        console.log("=== 步骤7：上传加密的文档集合到 IPFS ===");
        toast.loading("Uploading document collection to IPFS...", { id: "publish-progress" });

        const collectionFileName = `document_collection_${Date.now()}.bin`;
        const collectionIpfsResult = await uploadToIPFS(collectionEncryptionResult.encryptedData, {
          fileName: collectionFileName,
          fileType: "application/octet-stream",
          metadata: {
            uploadedAt: currentTimestamp,
            encrypted: "true",
            walletAddress: walletAddress,
            source: "BlueDoku_DocumentCollection",
            collectionSize: updatedOriginalMetadata.length.toString()
          }
        });

        console.log("文档集合 IPFS 上传结果:", collectionIpfsResult);

        // 步骤8：准备集合的 MetaMask 加密密钥
        console.log("=== 步骤8：MetaMask 加密集合密钥 ===");
        toast.loading("Encrypting collection key data...", { id: "publish-progress" });

        const collectionKeyData = {
          encryptionKey: collectionEncryptionResult.key,
          nonce: collectionEncryptionResult.nonce,
          ipfsHash: collectionIpfsResult.IpfsHash,
          timestamp: collectionIpfsResult.Timestamp
        };

        const encryptedCollectionMemo = await encryptWithMetaMask(
          JSON.stringify(collectionKeyData),
          publicKey
        );

        console.log("集合密钥 MetaMask 加密成功");

        // 步骤9：初始化合约
        console.log("=== 步骤9：初始化合约 ===");
        toast.loading("Initializing contract...", { id: "publish-progress" });

        const contract = getDefaultContract();
        await contract.init();
        console.log("合约初始化成功");

        // 步骤10：检查用户 NFT 状态
        console.log("=== 步骤10：检查用户 NFT 状态 ===");
        toast.loading("Checking user NFT status...", { id: "publish-progress" });

        const tokenIds = await contract.getUserTokenIds(walletAddress);
        console.log("用户拥有的 TokenId 列表:", tokenIds.map(id => id.toString()));

        // 步骤11：创建或更新 DocumentList NFT
        console.log("=== 步骤11：创建或更新 DocumentList NFT ===");
        
        let operation: 'create' | 'update';
        let tokenId: bigint;
        let txHash: string;

        if (tokenIds.length === 0) {
          // 创建新的 DocumentList
          console.log("用户没有 NFT，创建新的 DocumentList");
          toast.loading("Creating new document list NFT...", { id: "publish-progress" });

          const createResult = await contract.createDocumentListWithDetails(
            collectionIpfsResult.IpfsHash, 
            encryptedCollectionMemo
          );
          tokenId = createResult.tokenId;
          txHash = createResult.txHash;
          operation = 'create';

          console.log("创建 NFT 成功:", {
            tokenId: tokenId.toString(),
            txHash: txHash
          });

        } else {
          // 更新现有的 DocumentList (使用第一个)
          console.log("用户有 NFT，更新现有的 DocumentList");
          toast.loading("Updating document list NFT...", { id: "publish-progress" });

          tokenId = tokenIds[0];
          const updateResult = await contract.updateDocumentListWithDetails(
            tokenId, 
            collectionIpfsResult.IpfsHash, 
            encryptedCollectionMemo
          );
          txHash = updateResult.txHash;
          operation = 'update';

          console.log("更新 NFT 成功:", {
            tokenId: tokenId.toString(),
            txHash: txHash
          });
        }

        toast.loading("Waiting for transaction confirmation...", { id: "publish-progress" });

        // 显示最终成功消息
        toast.success(
          operation === 'create' ? "Document list NFT created successfully!" : "Document list NFT updated successfully!",
          {
            id: "publish-progress",
            description: `TokenId: ${tokenId.toString()}`,
            duration: 5000
          }
        );

                 console.log("=== 完整流程完成 ===");
         console.log("操作结果:", {
           operation,
           tokenId: tokenId.toString(),
           txHash: txHash,
           collectionIpfsHash: collectionIpfsResult.IpfsHash,
           documentCount: updatedOriginalMetadata.length
         });
         
         // 重置编辑状态
         setIsEditingNewFile(false);
         
         // 重新获取用户NFT信息，刷新文件列表
         console.log("=== 刷新文件列表 ===");
         await fetchUserNFTs(walletAddress);
        
      } catch (error) {
        console.error("文件发布失败:", error);
        toast.error("File publication failed", {
          id: "publish-progress",
          description: error instanceof Error ? error.message : "Unknown error",
          duration: 5000
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // 处理已有文件的更新
      try {
        // 前置检查
        if (!isWalletConnected || !walletAddress) {
          toast.error("Please connect your wallet first");
          return;
        }

        if (!publicKey) {
          toast.error("Unable to get wallet public key, please reconnect your wallet");
          return;
        }

        if (!newContent.trim()) {
          toast.error("File content cannot be empty");
          return;
        }

        if (!newName.trim()) {
          toast.error("File name cannot be empty");
          return;
        }

        // 显示开始处理的提示
        toast.loading("Processing file update…", { id: "update-progress" });

        // 步骤1：加密单个文件内容
        console.log("=== 步骤1-开始加密更新的文件内容 ===");
        toast.loading("Encrypting file content…", { id: "update-progress" });
        
        const encryptionResult = encryptText(newContent);
        console.log("加密结果:", encryptionResult.encryptedData);

        // 步骤2：上传单个文件到 IPFS
        console.log("=== 步骤2：开始上传更新的文件到 IPFS ===");
        toast.loading("Uploading file to IPFS…", { id: "update-progress" });
        const ipfsFileName = `encrypted_document_${Date.now()}.bin`;
        const ipfsResult = await uploadToIPFS(encryptionResult.encryptedData, {
          fileName: ipfsFileName,
          fileType: "application/octet-stream",
          metadata: {
            uploadedAt: currentTimestamp,
            encrypted: "true",
            walletAddress: walletAddress,
            source: "BlueDoku_DocumentEditor"
          }
        });

        const keyData = {
          encryptionKey: encryptionResult.key,
          nonce: encryptionResult.nonce,
          ipfsHash: ipfsResult.IpfsHash,
          timestamp: ipfsResult.Timestamp
        };
        const encryptedKeyData = await encryptWithMetaMask(
          JSON.stringify(keyData),
          publicKey
        );

        // 步骤4：创建更新的文件元数据
        console.log("=== 步骤4：创建更新的文件元数据 ===");
        toast.loading("Creating file metadata…", { id: "update-progress" });

        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsResult.IpfsHash}`;

        const updatedDocumentMetadata = {
          uid: fileId, // 保持原有的 uid
          fileName: ipfsFileName,
          fileType: "application/octet-stream",
          metadata: {
            uploadedAt: currentTimestamp,        
            encrypted: "true",
            title: newName
          },
          ipfsResult: {
            ipfsHash: ipfsResult.IpfsHash,
            gatewayUrl: gatewayUrl,
            pinSize: ipfsResult.PinSize,
            timestamp: ipfsResult.Timestamp
          },
          encryptionInfo: {
            metamaskEncryptedKeys: encryptedKeyData
          }
        };

        console.log("=== 创建的更新文件元数据 ===");
        console.log(JSON.stringify(updatedDocumentMetadata, null, 2));

        // 步骤5：更新文档集合中的文件
        console.log("=== 步骤5：更新文档集合中的文件 ===");
       
        // 在原始文档元数据中找到对应文件并替换
        const updatedOriginalMetadata = originalDocumentMetadata.map(doc => 
          doc.uid === fileId ? updatedDocumentMetadata : doc
        );
        setOriginalDocumentMetadata(updatedOriginalMetadata);
        console.log("=== 更新后的原始文档元数据集合 ===");
        console.log(JSON.stringify(updatedOriginalMetadata, null, 2));

        // 步骤6：加密整个文档集合
        console.log("=== 步骤6：开始加密文档集合 ===");
        toast.loading("Encrypting document collection…", { id: "update-progress" });

        const collectionJSON = JSON.stringify(updatedOriginalMetadata);
        const collectionEncryptionResult = encryptText(collectionJSON);
        console.log("文档集合加密结果:", {
          originalSize: collectionJSON.length,
          encryptedSize: collectionEncryptionResult.encryptedData.length
        });

        // 步骤7：上传加密的文档集合到 IPFS
        console.log("=== 步骤7：上传加密的文档集合到 IPFS ===");
        toast.loading("Uploading document collection to IPFS…", { id: "update-progress" });

        const collectionFileName = `document_collection_${Date.now()}.bin`;
        const collectionIpfsResult = await uploadToIPFS(collectionEncryptionResult.encryptedData, {
          fileName: collectionFileName,
          fileType: "application/octet-stream",
          metadata: {
            uploadedAt: currentTimestamp,
            encrypted: "true",
            walletAddress: walletAddress,
            source: "BlueDoku_DocumentCollection",
            collectionSize: updatedOriginalMetadata.length.toString()
          }
        });

        console.log("文档集合 IPFS 上传结果:", collectionIpfsResult);

        // 步骤8：准备集合的 MetaMask 加密密钥
        console.log("=== 步骤8：MetaMask 加密集合密钥 ===");
        toast.loading("Encrypting collection key data…", { id: "update-progress" });

        const collectionKeyData = {
          encryptionKey: collectionEncryptionResult.key,
          nonce: collectionEncryptionResult.nonce,
          ipfsHash: collectionIpfsResult.IpfsHash,
          timestamp: collectionIpfsResult.Timestamp
        };

        const encryptedCollectionMemo = await encryptWithMetaMask(
          JSON.stringify(collectionKeyData),
          publicKey
        );

        console.log("集合密钥 MetaMask 加密成功");

        // 步骤9：初始化合约
        console.log("=== 步骤9：初始化合约 ===");
        toast.loading("Initializing contract…", { id: "update-progress" });

        const contract = getDefaultContract();
        await contract.init();
        console.log("合约初始化成功");

        // 步骤10：检查用户 NFT 状态
        console.log("=== 步骤10：检查用户 NFT 状态 ===");
        toast.loading("Checking user NFT status…", { id: "update-progress" });

        const tokenIds = await contract.getUserTokenIds(walletAddress);
        console.log("用户拥有的 TokenId 列表:", tokenIds.map(id => id.toString()));

        // 步骤11：更新 DocumentList NFT
        console.log("=== 步骤11：更新 DocumentList NFT ===");
        
        let operation: 'create' | 'update';
        let tokenId: bigint;
        let txHash: string;

        if (tokenIds.length === 0) {
          // 理论上不应该发生，因为更新文件意味着用户已经有 NFT
          console.log("警告：更新文件但用户没有 NFT，创建新的 DocumentList");
          toast.loading("Creating new document list NFT…", { id: "update-progress" });

          const createResult = await contract.createDocumentListWithDetails(
            collectionIpfsResult.IpfsHash, 
            encryptedCollectionMemo
          );
          tokenId = createResult.tokenId;
          txHash = createResult.txHash;
          operation = 'create';

          console.log("创建 NFT 成功:", {
            tokenId: tokenId.toString(),
            txHash: txHash
          });

        } else {
          // 更新现有的 DocumentList (使用第一个)
          console.log("更新现有的 DocumentList");
          toast.loading("Updating document list NFT…", { id: "update-progress" });

          tokenId = tokenIds[0];
          const updateResult = await contract.updateDocumentListWithDetails(
            tokenId, 
            collectionIpfsResult.IpfsHash, 
            encryptedCollectionMemo
          );
          txHash = updateResult.txHash;
          operation = 'update';

          console.log("更新 NFT 成功:", {
            tokenId: tokenId.toString(),
            txHash: txHash
          });
        }

        toast.loading("Waiting for transaction confirmation…", { id: "update-progress" });

        // 显示最终成功消息
        toast.success("File updated successfully!", {
          id: "update-progress",
          description: `TokenId: ${tokenId.toString()}`,
          duration: 5000
        });

        console.log("=== 文件更新完成 ===");
        console.log("更新结果:", {
          operation,
          tokenId: tokenId.toString(),
          txHash: txHash,
          collectionIpfsHash: collectionIpfsResult.IpfsHash,
          documentCount: updatedOriginalMetadata.length,
          updatedFileId: fileId
        });
         
        // 重新获取用户NFT信息，刷新文件列表
        console.log("=== 刷新文件列表 ===");
        await fetchUserNFTs(walletAddress);

      } catch (error) {
        console.error("文件更新失败:", error);
        toast.error("Failed to update file", {
          id: "update-progress",
          description: error instanceof Error ? error.message : "Unknown error",
          duration: 5000
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 事件处理函数：刷新文件列表
  const handleRefreshFiles = async () => {
    if (!isWalletConnected || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    // 直接调用 fetchUserNFTs 重新获取数据，就像页面加载时一样
    await fetchUserNFTs(walletAddress);
  };

  // 事件处理函数：删除文件（软删除）
  const handleDeleteFile = async (fileId: string) => {
    
    if (isProcessing) {
      alert("Please wait for the current file processing to complete.");
      return;
    }
    // 前置检查
    if (!isWalletConnected || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!publicKey) {
      toast.error("Unable to get wallet public key, please reconnect your wallet");
      return;
    }

    // 检查文件是否存在
    const fileToDelete = files.find((f) => f.id === fileId);
    if (!fileToDelete) {
      toast.error("File not found");
      return;
    }

    // 检查文件是否已经被删除
    if (fileToDelete.isDeleted) {
      toast.error("File is already deleted");
      return;
    }

    // 设置处理状态
    setIsProcessing(true);

    try {
      // 显示开始处理的提示
      toast.loading("Processing file deletion...", { id: "delete-progress" });

      // 步骤1：软删除标记 - 更新 originalDocumentMetadata
      console.log("=== 步骤1：软删除标记 ===");
      toast.loading("Marking file as deleted...", { id: "delete-progress" });
      
      const currentTimestamp = new Date().toISOString();
      const updatedOriginalMetadata = originalDocumentMetadata.map(doc => 
        doc.uid === fileId 
          ? { ...doc, isDeleted: true, deletedAt: currentTimestamp }
          : doc
      );
      setOriginalDocumentMetadata(updatedOriginalMetadata);

      // 同时更新前端文件列表
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

      console.log("=== 软删除标记完成 ===");
      console.log("更新后的文档元数据集合:", JSON.stringify(updatedOriginalMetadata, null, 2));

      // 步骤2：加密整个文档集合
      console.log("=== 步骤2：开始加密文档集合 ===");
      toast.loading("Encrypting document collection...", { id: "delete-progress" });

      const collectionJSON = JSON.stringify(updatedOriginalMetadata);
      const collectionEncryptionResult = encryptText(collectionJSON);
      console.log("文档集合加密结果:", {
        originalSize: collectionJSON.length,
        encryptedSize: collectionEncryptionResult.encryptedData.length
      });

      // 步骤3：上传加密的文档集合到 IPFS
      console.log("=== 步骤3：上传加密的文档集合到 IPFS ===");
      toast.loading("Uploading document collection to IPFS...", { id: "delete-progress" });

      const collectionFileName = `document_collection_${Date.now()}.bin`;
      const collectionIpfsResult = await uploadToIPFS(collectionEncryptionResult.encryptedData, {
        fileName: collectionFileName,
        fileType: "application/octet-stream",
        metadata: {
          uploadedAt: currentTimestamp,
          encrypted: "true",
          walletAddress: walletAddress,
          source: "BlueDoku_DocumentCollection",
          collectionSize: updatedOriginalMetadata.length.toString(),
          operation: "delete"
        }
      });

      console.log("文档集合 IPFS 上传结果:", collectionIpfsResult);

      // 步骤4：准备集合的 MetaMask 加密密钥
      console.log("=== 步骤4：MetaMask 加密集合密钥 ===");
      toast.loading("Encrypting collection key data...", { id: "delete-progress" });

      const collectionKeyData = {
        encryptionKey: collectionEncryptionResult.key,
        nonce: collectionEncryptionResult.nonce,
        ipfsHash: collectionIpfsResult.IpfsHash,
        timestamp: collectionIpfsResult.Timestamp
      };

      const encryptedCollectionMemo = await encryptWithMetaMask(
        JSON.stringify(collectionKeyData),
        publicKey
      );

      console.log("集合密钥 MetaMask 加密成功");

      // 步骤5：初始化合约
      console.log("=== 步骤5：初始化合约 ===");
      toast.loading("Initializing contract...", { id: "delete-progress" });

      const contract = getDefaultContract();
      await contract.init();
      console.log("合约初始化成功");

      // 步骤6：检查用户 NFT 状态
      console.log("=== 步骤6：检查用户 NFT 状态 ===");
      toast.loading("Checking user NFT status...", { id: "delete-progress" });

      const tokenIds = await contract.getUserTokenIds(walletAddress);
      console.log("用户拥有的 TokenId 列表:", tokenIds.map(id => id.toString()));

      // 步骤7：更新 DocumentList NFT
      console.log("=== 步骤7：更新 DocumentList NFT ===");
      
      if (tokenIds.length === 0) {
        throw new Error("No NFT found for this user. Cannot delete file without existing NFT.");
      }

      // 更新现有的 DocumentList (使用第一个)
      console.log("更新现有的 DocumentList");
      toast.loading("Updating document list NFT...", { id: "delete-progress" });

      const tokenId = tokenIds[0];
      const updateResult = await contract.updateDocumentListWithDetails(
        tokenId, 
        collectionIpfsResult.IpfsHash, 
        encryptedCollectionMemo
      );
      const txHash = updateResult.txHash;

      console.log("更新 NFT 成功:", {
        tokenId: tokenId.toString(),
        txHash: txHash
      });

      // 步骤8：等待交易确认
      console.log("=== 步骤8：等待交易确认 ===");
      toast.loading("Waiting for transaction confirmation...", { id: "delete-progress" });

      // 显示最终成功消息
      toast.success("File deleted successfully!", {
        id: "delete-progress",
        description: `TokenId: ${tokenId.toString()}`,
        duration: 5000
      });

      console.log("=== 文件删除完成 ===");
      console.log("删除结果:", {
        operation: 'delete',
        tokenId: tokenId.toString(),
        txHash: txHash,
        collectionIpfsHash: collectionIpfsResult.IpfsHash,
        documentCount: updatedOriginalMetadata.length,
        deletedFileId: fileId
      });
       
      // 步骤9：重新获取用户NFT信息，刷新文件列表
      console.log("=== 步骤9：刷新文件列表 ===");
      await fetchUserNFTs(walletAddress);

    } catch (error) {
      console.error("文件删除失败:", error);
      toast.error("File deletion failed", {
        id: "delete-progress",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000
      });
      
      // 回滚前端状态
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, isDeleted: false } : file
        )
      );
      
      // 回滚 originalDocumentMetadata
      const rolledBackMetadata = originalDocumentMetadata.map(doc => 
        doc.uid === fileId 
          ? { ...doc, isDeleted: false, deletedAt: undefined }
          : doc
      );
      setOriginalDocumentMetadata(rolledBackMetadata);
      
    } finally {
      setIsProcessing(false);
    }
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
            isProcessing={isProcessing}
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
          isProcessing={isProcessing}
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
            BlueDoku
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
