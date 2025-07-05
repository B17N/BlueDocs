"use client"

import { useState } from "react"
import { toast } from "sonner"
import { uploadToIPFS, downloadFromIPFS } from "@/lib/ipfs"
import { encryptText, decryptData, type EncryptionResult } from "@/lib/encryption"
import { encryptWithMetaMask } from "@/lib/metamask-crypto"
import { getDefaultContract, type DocumentList, type ContractTransactionResult, CONTRACT_ADDRESS } from "@/lib/contract"
import { useWallet, WalletProvider } from "@/components/wallet-provider"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "@/components/ui/sonner"
import { Upload, Copy, ExternalLink, FileText, Lock, Unlock, Eye, EyeOff, Download, Wallet, Key, Shield } from "lucide-react"

// 内部组件，使用钱包功能
function Test1PageContent() {
  // 钱包状态和操作
  const {
    isConnected,
    address,
    publicKey,
    isLoading: walletLoading,
    error: walletError,
    connectWallet,
    disconnectWallet
  } = useWallet()

  // 状态管理：编辑框内容
  const [textContent, setTextContent] = useState("")
  // 状态管理：文档标题
  const [documentTitle, setDocumentTitle] = useState("")
  // 状态管理：上传状态
  const [isUploading, setIsUploading] = useState(false)
  // 状态管理：加密结果
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null)
  // 状态管理：上传结果
  const [uploadResult, setUploadResult] = useState<{
    ipfsHash: string;
    gatewayUrl: string;
    pinSize: number;
    timestamp: string;
    encryptionKey: string;
    nonce: string;
    walletAddress?: string;
    title?: string;
  } | null>(null)
  
  // 状态管理：解密相关
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptedText, setDecryptedText] = useState("")
  const [showDecryptedText, setShowDecryptedText] = useState(false)
  const [decryptionKey, setDecryptionKey] = useState("")
  const [decryptionNonce, setDecryptionNonce] = useState("")
  const [decryptionHash, setDecryptionHash] = useState("")

  // 全局文档集合 - 存储所有上传的文档元数据
  const [fileMetadataCollection, setFileMetadataCollection] = useState<Array<{
    uid: string;
    fileName: string;
    fileType: string;
    metadata: {
      uploadedAt: string;
      originalLength: string;
      encrypted: string;
      title: string;
    };
    ipfsResult: {
      ipfsHash: string;
      gatewayUrl: string;
      pinSize: number;
      timestamp: string;
    };
    encryptionInfo: {
      metamaskEncryptedKeys: any;
    };
  }>>([])

  // 合约操作相关状态
  const [isContractOperating, setIsContractOperating] = useState(false)
  const [contractResult, setContractResult] = useState<{
    operation: 'create' | 'update';
    tokenId: string;
    ipfsHash: string;
    txHash: string;
    timestamp: string;
  } | null>(null)
  const [userDocumentLists, setUserDocumentLists] = useState<DocumentList[]>([])
  const [userTokenIds, setUserTokenIds] = useState<bigint[]>([])

  // 生成网关 URL
  const generateGatewayURL = (ipfsHash: string): string => {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
  }

  // 处理文本加密并上传到 IPFS
  const handleEncryptAndUpload = async () => {
    // 检查内容是否为空
    if (!textContent.trim()) {
      toast.error("请输入要上传的内容")
      return
    }

    setIsUploading(true)
    
    try {
      // 显示加密开始 Toast
      toast.loading("正在加密文本...", {
        id: "encrypt-progress"
      })

      // 1. 加密文本
      const encrypted = encryptText(textContent)
      setEncryptionResult(encrypted)

      // 显示上传开始 Toast
      toast.loading("正在上传加密数据到 IPFS...", {
        id: "encrypt-progress"
      })

             // 2. 上传加密数据到 IPFS
       const result = await uploadToIPFS(encrypted.encryptedData, {
         fileName: `encrypted_document_${Date.now()}.bin`,
         fileType: "application/octet-stream",
         metadata: {
           uploadedAt: new Date().toISOString(),
           originalLength: textContent.length.toString(),
           encrypted: "true",
           walletAddress: isConnected ? address : "anonymous",
           hasWalletKey: isConnected && publicKey ? "true" : "false",
           source: "BlueDoku_Test1_Encrypted",
           title: documentTitle
         }
       })

      // 生成网关 URL
      const gatewayUrl = generateGatewayURL(result.IpfsHash)

             // 保存上传结果
       const uploadData = {
         ipfsHash: result.IpfsHash,
         gatewayUrl: gatewayUrl,
         pinSize: result.PinSize,
         timestamp: result.Timestamp,
         encryptionKey: encrypted.key,
         nonce: encrypted.nonce,
         walletAddress: isConnected ? address : undefined,
         title: documentTitle
       }
      setUploadResult(uploadData)

      // 自动填充解密表单
      setDecryptionHash(result.IpfsHash)
      setDecryptionKey(encrypted.key)
      setDecryptionNonce(encrypted.nonce)

      // 使用 MetaMask 加密 encryptionKey 和 nonce
      let encryptedKeyData = null
      if (isConnected && publicKey) {
        try {
          const keyData = {
            encryptionKey: encrypted.key,
            nonce: encrypted.nonce,
            ipfsHash: result.IpfsHash,
            timestamp: result.Timestamp
          }
          
          console.log("准备用 MetaMask 加密的密钥数据:", keyData)
          
          encryptedKeyData = await encryptWithMetaMask(
            JSON.stringify(keyData),
            publicKey
          )
          
          console.log("MetaMask 加密后的密钥数据:", encryptedKeyData)
          
        } catch (metamaskError) {
          console.error("MetaMask 加密密钥数据失败:", metamaskError)
          // 不影响主流程，只是记录错误
        }
      } else {
        console.log("钱包未连接或无公钥，跳过 MetaMask 加密")
      }

      // 生成唯一的文件ID
      const uid = crypto.randomUUID()
      
      // 创建当前文档的元数据
      const currentDocumentMetadata = {
        uid: uid,
        fileName: `encrypted_document_${Date.now()}.bin`,
        fileType: "application/octet-stream",
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalLength: textContent.length.toString(),
          encrypted: "true",
          title: documentTitle
        },
        ipfsResult: {
          ipfsHash: result.IpfsHash,
          gatewayUrl: gatewayUrl,
          pinSize: result.PinSize,
          timestamp: result.Timestamp
        },
        encryptionInfo: {
          metamaskEncryptedKeys: encryptedKeyData,
        }
      }
      
      // 将当前文档元数据追加到全局集合中
      setFileMetadataCollection(prevCollection => [...prevCollection, currentDocumentMetadata])
      
      console.log("=== 当前文档元数据 ===")
      console.log(JSON.stringify(currentDocumentMetadata, null, 2))
      
      console.log("=== 更新后的文档集合 ===")
      console.log(JSON.stringify([...fileMetadataCollection, currentDocumentMetadata], null, 2))

      // 显示成功 Toast
      toast.success("加密并上传成功！", {
        id: "encrypt-progress",
        description: `IPFS 哈希：${result.IpfsHash}`,
        duration: 5000
      })

      console.log("加密并上传成功:", { result, encrypted })

    } catch (error) {
      console.error("加密或上传失败:", error)
      
      // 显示错误 Toast
      toast.error("操作失败", {
        id: "encrypt-progress",
        description: error instanceof Error ? error.message : "未知错误",
        duration: 5000
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 处理从 IPFS 下载并解密
  const handleDownloadAndDecrypt = async () => {
    if (!decryptionHash.trim() || !decryptionKey.trim() || !decryptionNonce.trim()) {
      toast.error("请填写完整的解密信息")
      return
    }

    setIsDecrypting(true)
    
    try {
      toast.loading("正在从 IPFS 下载数据...", {
        id: "decrypt-progress"
      })

      // 1. 从 IPFS 下载数据
      const encryptedData = await downloadFromIPFS(decryptionHash)

      toast.loading("正在解密数据...", {
        id: "decrypt-progress"
      })

      // 2. 解密数据
      const decrypted = decryptData(encryptedData, decryptionKey, decryptionNonce)
      setDecryptedText(decrypted)

      toast.success("下载并解密成功！", {
        id: "decrypt-progress",
        duration: 3000
      })

    } catch (error) {
      console.error("下载或解密失败:", error)
      
      toast.error("解密失败", {
        id: "decrypt-progress",
        description: error instanceof Error ? error.message : "未知错误",
        duration: 5000
      })
    } finally {
      setIsDecrypting(false)
    }
  }

  // 处理合约操作 - 保存文档集合到区块链
  const handleSaveToContract = async () => {
    // 检查钱包连接状态
    if (!isConnected || !address) {
      toast.error("请先连接钱包")
      return
    }

    // 检查是否有文档集合数据
    if (fileMetadataCollection.length === 0) {
      toast.error("没有文档数据可以保存到合约")
      return
    }

    // 检查是否有公钥用于 MetaMask 加密
    if (!publicKey) {
      toast.error("无法获取钱包公钥，请重新连接钱包")
      return
    }

    setIsContractOperating(true)
    
    try {
      // 显示进度
      toast.loading("正在初始化合约...", {
        id: "contract-progress"
      })

      // 1. 初始化合约
      const contract = getDefaultContract()
      await contract.init()

      // 2. 检查用户是否已有 DocumentList
      toast.loading("正在检查用户文档列表...", {
        id: "contract-progress"
      })

      const tokenIds = await contract.getUserTokenIds(address)
      setUserTokenIds(tokenIds)
      
      console.log("用户拥有的 TokenId 列表:", tokenIds.map(id => id.toString()))

      // 3. 准备数据 - 将 fileMetadataCollection 加密
      toast.loading("正在准备数据...", {
        id: "contract-progress"
      })

      const dataToEncrypt = JSON.stringify(fileMetadataCollection)
      const encryptedData = encryptText(dataToEncrypt)
      
      console.log("准备上传的数据大小:", dataToEncrypt.length, "字符")
      console.log("加密后的数据大小:", encryptedData.encryptedData.length, "字节")

      // 4. 上传加密数据到 IPFS
      toast.loading("正在上传数据到 IPFS...", {
        id: "contract-progress"
      })

      const ipfsResult = await uploadToIPFS(encryptedData.encryptedData, {
        fileName: `document_collection_${Date.now()}.bin`,
        fileType: "application/octet-stream",
        metadata: {
          uploadedAt: new Date().toISOString(),
          encrypted: "true",
          walletAddress: address,
          source: "BlueDoku_DocumentCollection",
          collectionSize: fileMetadataCollection.length.toString()
        }
      })

      const ipfsHash = ipfsResult.IpfsHash
      console.log("IPFS 上传成功:", ipfsHash)

      // 5. 准备 MetaMask 加密的密钥数据
      const keyData = {
        encryptionKey: encryptedData.key,
        nonce: encryptedData.nonce,
        ipfsHash: ipfsHash,
        timestamp: ipfsResult.Timestamp
      }

      toast.loading("正在加密密钥数据...", {
        id: "contract-progress"
      })

      const encryptedMemo = await encryptWithMetaMask(
        JSON.stringify(keyData),
        publicKey
      )

      console.log("MetaMask 加密成功")

      // 6. 根据用户是否有 DocumentList 决定操作
      let operation: 'create' | 'update'
      let tokenId: bigint
      let txHash: string

      if (tokenIds.length === 0) {
        // 创建新的 DocumentList
        toast.loading("正在创建新的文档列表 NFT...", {
          id: "contract-progress"
        })

        console.log("钱包地址:", address)

        // 调用合约创建方法（包含详细信息）
        const createResult = await contract.createDocumentListWithDetails(ipfsHash, encryptedMemo)
        tokenId = createResult.tokenId
        txHash = createResult.txHash
        operation = 'create'
        
        toast.loading("等待交易确认...", {
          id: "contract-progress"
        })
        
      } else {
        // 更新现有的 DocumentList (使用第一个)
        toast.loading("正在更新文档列表 NFT...", {
          id: "contract-progress"
        })

        tokenId = tokenIds[0]
        
        console.log("钱包地址:", address)

        // 调用合约更新方法（包含详细信息）
        const updateResult = await contract.updateDocumentListWithDetails(tokenId, ipfsHash, encryptedMemo)
        txHash = updateResult.txHash
        operation = 'update'
        
        toast.loading("等待交易确认...", {
          id: "contract-progress"
        })
      }

      // 7. 更新用户文档列表
      const updatedDocumentLists = await contract.getUserDocumentLists(address)
      setUserDocumentLists(updatedDocumentLists)

      // 8. 保存操作结果
      const result = {
        operation,
        tokenId: tokenId.toString(),
        ipfsHash: ipfsHash,
        txHash: txHash,
        timestamp: new Date().toISOString()
      }
      setContractResult(result)

      // 显示成功消息
      toast.success(
        operation === 'create' ? "文档列表 NFT 创建成功！" : "文档列表 NFT 更新成功！",
        {
          id: "contract-progress",
          description: `TokenId: ${tokenId.toString()}`,
          duration: 5000
        }
      )

      console.log("合约操作完成:", result)

    } catch (error) {
      console.error("合约操作失败:", error)
      
      toast.error("合约操作失败", {
        id: "contract-progress",
        description: error instanceof Error ? error.message : "未知错误",
        duration: 5000
      })
    } finally {
      setIsContractOperating(false)
    }
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("已复制到剪贴板")
    } catch (err) {
      toast.error("复制失败")
    }
  }

  // 在新窗口打开链接
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">加密 IPFS 上传测试</h1>
          <p className="text-muted-foreground">
            输入文本 → 加密 → 上传到 IPFS → 下载并解密验证
          </p>
        </div>

        {/* 钱包连接状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              钱包连接状态
            </CardTitle>
            <CardDescription>
              连接钱包以关联您的加密上传记录
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 钱包连接按钮 */}
            <div className="flex items-center justify-between">
              <ConnectWalletButton
                isConnected={isConnected}
                walletAddress={address}
                onConnect={connectWallet}
                onDisconnect={disconnectWallet}
              />
              
              {/* 连接状态指示器 */}
              <div className="flex items-center gap-2">
                {walletLoading && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                    连接中...
                  </Badge>
                )}
                {isConnected && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    已连接
                  </Badge>
                )}
                {!isConnected && !walletLoading && (
                  <Badge variant="outline">未连接</Badge>
                )}
              </div>
            </div>

            {/* 钱包信息显示 */}
            {isConnected && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 钱包地址 */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Wallet className="h-4 w-4" />
                      钱包地址：
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-2 py-1 rounded border">
                        {address.slice(0, 8)}...{address.slice(-6)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* 加密公钥状态 */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Key className="h-4 w-4" />
                      加密公钥：
                    </label>
                    <div className="flex items-center gap-2">
                      {publicKey ? (
                        <>
                          <Badge variant="default" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            已获取
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(publicKey)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          未获取
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 错误信息显示 */}
            {walletError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <strong>钱包连接错误：</strong> {walletError}
              </div>
            )}

            {/* 钱包功能说明 */}
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <strong>💡 钱包集成功能：</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>连接钱包后，上传记录会关联到您的钱包地址</li>
                <li>可获取钱包的加密公钥，用于高级加密功能</li>
                <li>未连接钱包也可正常使用加密上传功能</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 主要编辑和上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              文本编辑器（加密上传）
            </CardTitle>
            <CardDescription>
              输入文本内容，将被加密后上传到 IPFS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 标题输入框 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">文档标题：</label>
              <Input
                placeholder="输入文档标题（不会被加密，作为元数据存储）"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="text-base"
              />
            </div>

            {/* 文本编辑框 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">文档内容：</label>
              <Textarea
                placeholder="在这里输入要加密并上传到 IPFS 的文本内容..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>

            {/* 字符计数 */}
            <div className="text-sm text-muted-foreground text-right space-y-1">
              <div>标题字符数：{documentTitle.length}</div>
              <div>内容字符数：{textContent.length}</div>
              <div>总字符数：{documentTitle.length + textContent.length}</div>
            </div>

            {/* 加密上传按钮 */}
            <Button 
              onClick={handleEncryptAndUpload}
              disabled={isUploading || !textContent.trim()}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  加密并上传中...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  加密并上传到 IPFS
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 上传结果显示 */}
        {uploadResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                加密上传成功！
              </CardTitle>
              <CardDescription>
                您的文件已加密并成功上传到 IPFS 网络
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 文档标题 */}
              {uploadResult.title && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-600 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    文档标题：
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-blue-50 border-blue-200 border rounded text-sm font-medium">
                      {uploadResult.title}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(uploadResult.title!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* IPFS 哈希 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">IPFS 哈希：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded border text-sm break-all">
                    {uploadResult.ipfsHash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(uploadResult.ipfsHash)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 加密密钥 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-600">🔑 加密密钥（请妥善保存）：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-red-50 border-red-200 border rounded text-sm break-all">
                    {uploadResult.encryptionKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(uploadResult.encryptionKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Nonce */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-600">🔐 随机数（Nonce）：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-red-50 border-red-200 border rounded text-sm break-all">
                    {uploadResult.nonce}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(uploadResult.nonce)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 网关链接 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">网关链接（加密数据）：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded border text-sm break-all">
                    {uploadResult.gatewayUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(uploadResult.gatewayUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInNewTab(uploadResult.gatewayUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 钱包关联信息 */}
              {uploadResult.walletAddress && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-600 flex items-center gap-1">
                    <Wallet className="h-4 w-4" />
                    关联钱包地址：
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-blue-50 border-blue-200 border rounded text-sm break-all">
                      {uploadResult.walletAddress}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(uploadResult.walletAddress!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* 文件信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">加密文件大小：</span>
                  {uploadResult.pinSize} bytes
                </div>
                <div>
                  <span className="font-medium">上传时间：</span>
                  {new Date(uploadResult.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 解密验证区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              解密验证
            </CardTitle>
            <CardDescription>
              输入 IPFS 哈希、密钥和 Nonce 来下载并解密数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* IPFS 哈希输入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">IPFS 哈希：</label>
              <Input
                placeholder="输入要解密的文件的 IPFS 哈希..."
                value={decryptionHash}
                onChange={(e) => setDecryptionHash(e.target.value)}
              />
            </div>

            {/* 密钥输入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">加密密钥：</label>
              <Input
                placeholder="输入 Base64 编码的加密密钥..."
                value={decryptionKey}
                onChange={(e) => setDecryptionKey(e.target.value)}
              />
            </div>

            {/* Nonce 输入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nonce：</label>
              <Input
                placeholder="输入 Base64 编码的 Nonce..."
                value={decryptionNonce}
                onChange={(e) => setDecryptionNonce(e.target.value)}
              />
            </div>

            {/* 解密按钮 */}
            <Button 
              onClick={handleDownloadAndDecrypt}
              disabled={isDecrypting || !decryptionHash.trim() || !decryptionKey.trim() || !decryptionNonce.trim()}
              className="w-full"
              variant="outline"
            >
              {isDecrypting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  下载并解密中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  从 IPFS 下载并解密
                </>
              )}
            </Button>

            {/* 解密结果 */}
            {decryptedText && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-green-600">解密结果：</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDecryptedText(!showDecryptedText)}
                  >
                    {showDecryptedText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showDecryptedText ? '隐藏' : '显示'}
                  </Button>
                </div>
                {showDecryptedText && (
                  <Textarea
                    value={decryptedText}
                    readOnly
                    rows={6}
                    className="bg-green-50 border-green-200"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 合约操作区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              区块链合约操作
            </CardTitle>
            <CardDescription>
              将文档集合保存到区块链智能合约，创建或更新 DocumentList NFT
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
                         {/* 当前状态显示 */}
             <div className="space-y-3">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* 钱包连接状态 */}
                 <div className="space-y-1">
                   <label className="text-sm font-medium">钱包状态：</label>
                   <div className="flex items-center gap-2">
                     {isConnected ? (
                       <Badge variant="default" className="text-xs">
                         <Shield className="h-3 w-3 mr-1" />
                         已连接
                       </Badge>
                     ) : (
                       <Badge variant="outline" className="text-xs">
                         未连接
                       </Badge>
                     )}
                   </div>
                 </div>

                 {/* 文档集合状态 */}
                 <div className="space-y-1">
                   <label className="text-sm font-medium">文档集合：</label>
                   <div className="flex items-center gap-2">
                     <Badge variant={fileMetadataCollection.length > 0 ? "default" : "outline"} className="text-xs">
                       <FileText className="h-3 w-3 mr-1" />
                       {fileMetadataCollection.length} 个文档
                     </Badge>
                   </div>
                 </div>

                 {/* NFT 状态 */}
                 <div className="space-y-1">
                   <label className="text-sm font-medium">NFT 状态：</label>
                   <div className="flex items-center gap-2">
                     <Badge variant={userTokenIds.length > 0 ? "default" : "outline"} className="text-xs">
                       <Key className="h-3 w-3 mr-1" />
                       {userTokenIds.length > 0 ? `${userTokenIds.length} 个 NFT` : '无 NFT'}
                     </Badge>
                   </div>
                 </div>
               </div>

               {/* 合约地址显示 */}
               <div className="space-y-2">
                 <label className="text-sm font-medium">合约地址：</label>
                 <div className="flex items-center gap-2">
                   <code className="flex-1 p-2 bg-muted rounded border text-sm break-all">
                     {CONTRACT_ADDRESS}
                   </code>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => copyToClipboard(CONTRACT_ADDRESS)}
                   >
                     <Copy className="h-4 w-4" />
                   </Button>
                   {CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000' && (
                     <Badge variant="destructive" className="text-xs">
                       未配置
                     </Badge>
                   )}
                 </div>
               </div>

              {/* 用户拥有的 TokenIds */}
              {userTokenIds.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-600">拥有的 TokenIds：</label>
                  <div className="flex flex-wrap gap-2">
                    {userTokenIds.map((tokenId, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{tokenId.toString()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="space-y-2">
                             <Button 
                 onClick={handleSaveToContract}
                 disabled={isContractOperating || !isConnected || fileMetadataCollection.length === 0 || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000'}
                 className="w-full"
                 size="lg"
               >
                {isContractOperating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    正在处理合约操作...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {userTokenIds.length > 0 ? '更新 DocumentList NFT' : '创建 DocumentList NFT'}
                  </>
                )}
              </Button>

              {/* 操作说明 */}
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <strong>💡 操作说明：</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>点击按钮将把当前文档集合保存到区块链合约</li>
                  <li>如果您还没有 DocumentList NFT，将创建一个新的</li>
                  <li>如果您已有 DocumentList NFT，将更新第一个</li>
                  <li>文档集合会被加密后上传到 IPFS，密钥用 MetaMask 加密</li>
                  <li>需要配置环境变量 NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS 为合约地址</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 合约操作结果 */}
        {contractResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                合约操作成功！
              </CardTitle>
              <CardDescription>
                {contractResult.operation === 'create' ? '已创建新的 DocumentList NFT' : '已更新 DocumentList NFT'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 操作类型 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">操作类型：</label>
                <div className="flex items-center gap-2">
                  <Badge variant={contractResult.operation === 'create' ? 'default' : 'secondary'} className="text-sm">
                    {contractResult.operation === 'create' ? '创建新 NFT' : '更新现有 NFT'}
                  </Badge>
                </div>
              </div>

              {/* Token ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Token ID：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded border text-sm">
                    #{contractResult.tokenId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(contractResult.tokenId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* IPFS 哈希 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">IPFS 哈希：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded border text-sm break-all">
                    {contractResult.ipfsHash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(contractResult.ipfsHash)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInNewTab(generateGatewayURL(contractResult.ipfsHash))}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction Hash：</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded border text-sm break-all">
                    {contractResult.txHash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(contractResult.txHash)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 操作时间 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">操作时间：</label>
                <div className="text-sm text-muted-foreground">
                  {new Date(contractResult.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>

              {/* 操作成功提示 */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <strong>✅ 成功完成：</strong> 您的文档集合已经安全地保存到区块链上，可以通过 TokenId #{contractResult.tokenId} 进行管理和访问。
              </div>
            </CardContent>
          </Card>
        )}

        {/* 说明信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔒 加密说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. <strong>加密算法</strong>：使用 TweetNaCl 的 XSalsa20-Poly1305 算法</p>
            <p>2. <strong>密钥管理</strong>：每次加密都会生成新的 32 字节密钥和 24 字节 Nonce</p>
            <p>3. <strong>安全性</strong>：没有密钥和 Nonce，任何人都无法解密您的数据</p>
            <p>4. <strong>重要提醒</strong>：请务必保存好加密密钥和 Nonce，丢失后无法恢复数据</p>
            <p>5. <strong>验证功能</strong>：可以使用解密区域验证上传的加密数据是否完整</p>
          </CardContent>
        </Card>

        {/* 合约功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">📦 区块链合约功能</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. <strong>DocumentList NFT</strong>：每个用户可以拥有多个文档列表 NFT</p>
            <p>2. <strong>数据存储</strong>：文档集合加密后存储在 IPFS，哈希保存在区块链上</p>
            <p>3. <strong>密钥保护</strong>：加密密钥通过 MetaMask 加密，确保只有钱包拥有者可以解密</p>
            <p>4. <strong>自动管理</strong>：首次使用创建新 NFT，后续操作自动更新第一个 NFT</p>
            <p>5. <strong>去中心化</strong>：所有数据和所有权信息都存储在区块链和 IPFS 上</p>
          </CardContent>
        </Card>
      </div>

      {/* Toast 通知组件 */}
      <Toaster />
    </div>
  )
}

// 主组件，包裹 WalletProvider
export default function Test1Page() {
  return (
    <WalletProvider>
      <Test1PageContent />
    </WalletProvider>
  )
}
