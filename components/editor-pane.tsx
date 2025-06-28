"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HistoryViewer } from "@/components/history-viewer"
import { Badge } from "@/components/ui/badge"
import { History, UploadCloud, Loader2, Share2, ArrowLeft } from "lucide-react"
import type { FileData } from "@/app/page"
import type { NFTInfo } from "@/lib/contract"
import { ShareDialog } from "@/components/share-dialog"
import { useToast } from "@/hooks/use-toast"
import { useDocumentManager } from "@/hooks/use-document-manager"
import { useWallet } from "@/hooks/use-wallet"
import {
  generateAESKey,
  exportKeyToHex,
  encryptWithAES,
  splitKey,
  encryptPartialKey,
  generateShareUrl
} from "@/lib/share-encryption"
import { uploadToIPFS } from "@/lib/ipfs"
import { createDocumentNFT, DOCUMENT_NFT_ABI, getDocumentNFTContract } from "@/lib/contract"
import { ethers } from "ethers"

interface EditorPaneProps {
  file: FileData
  onUpdateFile: (fileId: string, newName: string, newContent: string) => void
  isNew: boolean
  isMobile: boolean
  onBack: () => void
  nft?: NFTInfo | null
  onReloadFile?: () => void // 重新加载文件内容的回调
}

type ButtonState = "idle" | "encrypting" | "uploading" | "saving" | "success" | "error"

export function EditorPane({ file, onUpdateFile, isNew, isMobile, onBack, nft, onReloadFile }: EditorPaneProps) {
  const [fileName, setFileName] = useState(file.name)
  const [markdownContent, setMarkdownContent] = useState(file.content)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [buttonState, setButtonState] = useState<ButtonState>("idle")
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const { toast } = useToast()
  const documentManager = useDocumentManager()
  const { address: walletAddress } = useWallet()

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
    try {
      setButtonState("encrypting")
      // 调用真实的更新函数
      await onUpdateFile(file.id, fileName, markdownContent)
      
      setInitialFileName(fileName)
      setInitialMarkdownContent(markdownContent)
      setIsModified(false)
      setButtonState("success")
      
      setTimeout(() => {
        setButtonState("idle")
      }, 2000)
    } catch (error) {
      console.error('Failed to update file:', error)
      setButtonState("error")
      setTimeout(() => {
        setButtonState("idle")
      }, 3000)
    }
  }

  const getButtonContent = () => {
    switch (buttonState) {
      case "encrypting":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
            {isNew ? "Publishing..." : "Updating..."}
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

  const handleShare = async (content: string): Promise<string> => {
    if (!walletAddress) {
      throw new Error("Wallet not connected");
    }

    try {
      // Step 1: Generate AES-256 key
      const aesKey = await generateAESKey();
      const fullKeyHex = await exportKeyToHex(aesKey);
      
      // Step 2: Encrypt document with AES-256-GCM
      const { encrypted, iv } = await encryptWithAES(content, aesKey);
      
      // Step 3: Upload encrypted content to IPFS
      const uploadResult = await uploadToIPFS(encrypted);
      const ipfsHash = uploadResult.IpfsHash;
      
      // Step 4: Split key and encrypt partial key
      const { front: partialKey, secret: secretKey } = splitKey(fullKeyHex);
      const encryptedPartialKey = encryptPartialKey(partialKey, secretKey);
      
      // Step 5: Create share NFT
      const docMemoData = {
        version: "1.0-share",
        type: "shared",
        metadata: {
          fileName: fileName,
          fileType: "markdown",
          title: fileName.replace(/\.md$/, ''),
          createdAt: new Date().toISOString(),
          size: encrypted.byteLength,
          originalTokenId: file.tokenId?.toString()
        },
        shareInfo: {
          encryptedPartialKey: encryptedPartialKey,
          iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
          algorithm: "AES-256-GCM",
          keyEncryption: "XOR",
          sharedBy: walletAddress,
          sharedAt: new Date().toISOString()
        },
        versions: [{
          versionId: 1,
          ipfsHash: ipfsHash,
          timestamp: new Date().toISOString(),
          size: encrypted.byteLength,
          encryptedKey: encryptedPartialKey,
          encryptedNonce: "SHARED_DOCUMENT"
        }],
        currentVersion: 1
      };

      const params = {
        recipient: walletAddress,
        amount: 1,
        documentId: ipfsHash.substring(0, 8),
        docUID: ipfsHash,
        storageAddress: ipfsHash,
        docMemo: JSON.stringify(docMemoData)
      };
      
      // Create NFT and get transaction hash
      const txHash = await createDocumentNFT(params, walletAddress);
      
      // Get transaction receipt to extract tokenId
      const provider = new ethers.BrowserProvider(window.ethereum);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error("Failed to get transaction receipt");
      }
      
      // Parse the event logs to find DocumentCreated event
      const iface = new ethers.Interface(DOCUMENT_NFT_ABI);
      let tokenId: number | null = null;
      
      // Try to find DocumentCreated event
      const logs = receipt.logs.map(log => {
        try {
          return iface.parseLog(log);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      // Look for DocumentCreated event first
      const documentCreatedEvent = logs.find(log => log?.name === 'DocumentCreated');
      if (documentCreatedEvent) {
        tokenId = Number(documentCreatedEvent.args.tokenId);
      } else {
        // Fallback: Look for TransferSingle event (ERC1155)
        const transferEvent = logs.find(log => log?.name === 'TransferSingle');
        if (transferEvent) {
          tokenId = Number(transferEvent.args.id);
        } else {
          // Final fallback: Get the latest tokenId from contract
          console.log('No event found, fetching latest tokenId from contract...');
          const contract = getDocumentNFTContract();
          const currentTokenId = await contract.getCurrentTokenId();
          tokenId = Number(currentTokenId);
          
          // Verify that this NFT belongs to the user
          const balance = await contract.balanceOf(walletAddress, tokenId);
          if (Number(balance) === 0) {
            throw new Error("Failed to verify NFT ownership");
          }
        }
      }
      
      if (!tokenId) {
        throw new Error("Failed to get NFT token ID");
      }
      
      // Step 6: Generate share URL
      const shareUrl = generateShareUrl(tokenId, secretKey);
      
      return shareUrl;
    } catch (error) {
      console.error("Failed to create share link:", error);
      throw error;
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {isMobile && (
        <Button variant="outline" onClick={onBack} className="self-start">
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
              (buttonState !== "idle" && buttonState !== "success" && buttonState !== "error") ||
              (!isModified && !isNew)
            }
            title={!isModified && !isNew ? "No changes to save" : isNew ? "Publish this new file" : "Save your changes"}
            className="flex-1"
          >
            {getButtonContent()}
          </Button>
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              onClick={() => setIsShareDialogOpen(true)}
              disabled={isNew || isModified}
              title={isNew ? "Publish the file first to enable sharing" : isModified ? "Save your changes before sharing" : "Share file"}
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <label htmlFor="markdown-editor" className="text-sm font-medium mb-1">
          Markdown Editor
        </label>
        <Textarea
          id="markdown-editor"
          value={markdownContent}
          onChange={handleMarkdownChange}
          className="flex-1 resize-none font-mono text-sm"
          aria-label="Markdown Content"
        />
      </div>

      <HistoryViewer
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        nft={nft || null}
        fileName={fileName}
        onVersionRestored={onReloadFile}
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
