"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Copy, Eye, FileClock, Hash, RotateCcw, Loader2 } from "lucide-react"
import { useDocumentManager } from "@/hooks/use-document-manager"
import { useToast } from "@/hooks/use-toast"
import type { NFTInfo, DocumentVersion } from "@/lib/contract"

interface HistoryViewerProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  nft: NFTInfo | null
  fileName: string
  onVersionRestored?: () => void // 版本恢复成功后的回调
}

export function HistoryViewer({ isOpen, onOpenChange, nft, fileName, onVersionRestored }: HistoryViewerProps) {
  const documentManager = useDocumentManager()
  const { toast } = useToast()
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set())
  const [versionContents, setVersionContents] = useState<Map<number, string>>(new Map())
  const [loadingVersions, setLoadingVersions] = useState<Set<number>>(new Set())
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null)

  // 获取版本历史
  const versions = nft ? documentManager.getVersionHistory(nft) : []

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
      variant: "default"
    })
  }

  const handleToggleContent = async (version: DocumentVersion) => {
    const versionId = version.versionId
    
    if (expandedVersions.has(versionId)) {
      // 折叠版本内容
      setExpandedVersions(prev => {
        const newSet = new Set(prev)
        newSet.delete(versionId)
        return newSet
      })
      return
    }

    // 展开版本内容
    setExpandedVersions(prev => new Set([...prev, versionId]))

    // 如果内容还没有加载，则加载它
    if (!versionContents.has(versionId)) {
      setLoadingVersions(prev => new Set([...prev, versionId]))
      
      try {
        // 检查是否使用了合并格式（新格式）
        const isCombinedFormat = version.encryptedNonce === "COMBINED_FORMAT"
        let decryptResult

        if (isCombinedFormat) {
          // 新格式：使用合并的密钥解密（只需要一次MetaMask确认）
          decryptResult = await documentManager.downloadAndDecryptWithMetaMaskCombined(
            version.ipfsHash,
            version.encryptedKey
          )
        } else {
          // 旧格式：检查是否使用了 MetaMask 加密
          const isMetaMaskEncrypted = version.encryptedKey.startsWith('0x') && version.encryptedKey.length > 100
          
          if (isMetaMaskEncrypted) {
            decryptResult = await documentManager.downloadAndDecryptWithMetaMask(
              version.ipfsHash,
              version.encryptedKey,
              version.encryptedNonce
            )
          } else {
            decryptResult = await documentManager.downloadAndDecrypt(
              version.ipfsHash,
              version.encryptedKey,
              version.encryptedNonce
            )
          }
        }

        setVersionContents(prev => new Map([...prev, [versionId, decryptResult.content]]))
      } catch (error) {
        console.error('Failed to decrypt version content:', error)
        toast({
          title: "Failed to load version content",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive"
        })
      } finally {
        setLoadingVersions(prev => {
          const newSet = new Set(prev)
          newSet.delete(versionId)
          return newSet
        })
      }
    }
  }

  const handleRestoreVersion = async (version: DocumentVersion) => {
    if (!nft || restoringVersion) return

    setRestoringVersion(version.versionId)
    
    try {
      toast({
        title: "Restoring version...",
        description: `Restoring version ${version.versionId} as the latest version`
      })

      await documentManager.restoreVersion(nft, version.versionId)

      toast({
        title: "Version restored!",
        description: `Version ${version.versionId} has been restored as the latest version`,
        variant: "default"
      })

      // 调用回调函数通知父组件刷新
      if (onVersionRestored) {
        onVersionRestored()
      }

      // 关闭对话框
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to restore version:', error)
      toast({
        title: "Failed to restore version",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setRestoringVersion(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] md:max-w-[780px] lg:max-w-[900px] h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Version History: {fileName}</DialogTitle>
          <DialogDescription>
            Browse through all versions of your document. You can view content and restore any version as the latest.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4 py-4">
              {versions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No version history available.</p>
                </div>
              )}
              
              {versions.map((version, index) => {
              const isExpanded = expandedVersions.has(version.versionId)
              const content = versionContents.get(version.versionId)
              const isLoading = loadingVersions.has(version.versionId)
              const isRestoring = restoringVersion === version.versionId
              const isCurrentVersion = index === 0 // 第一个是最新版本

              return (
                <div key={version.versionId} className="p-4 border rounded-lg bg-card">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Version {version.versionId}</h3>
                      {isCurrentVersion && (
                        <Badge variant="default" className="text-xs">Latest</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <FileClock className="h-3 w-3 mr-1" />
                      {new Date(version.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Size: {formatFileSize(version.size)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Eye className="h-3 w-3 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground mr-2">IPFS:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1 mr-2">
                        {version.ipfsHash}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(version.ipfsHash, "IPFS Hash")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleContent(version)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Eye className="h-3 w-3 mr-1" />
                      )}
                      {isExpanded ? 'Hide Content' : 'View Content'}
                    </Button>

                    {!isCurrentVersion && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRestoreVersion(version)}
                        disabled={isRestoring || documentManager.nftState.isLoading}
                      >
                        {isRestoring ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3 mr-1" />
                        )}
                        Restore This Version
                      </Button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-md">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Decrypting content...</span>
                        </div>
                      ) : content ? (
                        <>
                          <pre className="text-sm max-h-60 overflow-y-auto whitespace-pre-wrap break-words mb-2">
                            {content}
                          </pre>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(content, "Content")}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy Content
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Failed to load content</p>
                      )}
                    </div>
                  )}
                </div>
              )
              })}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 