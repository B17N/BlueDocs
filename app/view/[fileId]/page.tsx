"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, FileText, ShieldAlert, LayoutPanelLeft, AlertCircle } from "lucide-react"
import { getDocumentInfoReadOnly } from "@/lib/infura-provider"
import { downloadFromIPFS } from "@/lib/ipfs"
import {
  decryptPartialKey,
  combineKey,
  importKeyFromHex,
  decryptWithAES
} from "@/lib/share-encryption"
import dynamic from 'next/dynamic'

// 动态导入 ReactMarkdown 以避免服务端渲染问题
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })

interface ShareDocMemoData {
  version: string;
  type: string;
  metadata: {
    fileName: string;
    fileType: string;
    title: string;
    createdAt: string;
    size: number;
    originalTokenId?: string;
  };
  shareInfo: {
    encryptedPartialKey: string;
    iv: string;
    algorithm: string;
    keyEncryption: string;
    sharedBy: string;
    sharedAt: string;
  };
  versions: Array<{
    versionId: number;
    ipfsHash: string;
    timestamp: string;
    size: number;
    encryptedKey: string;
    encryptedNonce: string;
  }>;
  currentVersion: number;
}

export default function SharedArticleViewPage() {
  const params = useParams()
  const tokenId = params.fileId as string

  const [documentTitle, setDocumentTitle] = useState<string>("")
  const [documentContent, setDocumentContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sharedBy, setSharedBy] = useState<string>("")
  const [sharedAt, setSharedAt] = useState<string>("")

  useEffect(() => {
    const loadSharedDocument = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Extract secret key from URL fragment
        const hash = window.location.hash;
        if (!hash.includes('#key=')) {
          throw new Error("Invalid share link. Missing decryption key.");
        }
        
        const secretKey = hash.replace('#key=', '');
        if (!secretKey || secretKey.length !== 8) {
          throw new Error("Invalid decryption key format.");
        }

        // Get NFT information using Infura (no wallet needed)
        const nftTokenId = parseInt(tokenId);
        if (isNaN(nftTokenId)) {
          throw new Error("Invalid document ID.");
        }

        const documentInfo = await getDocumentInfoReadOnly(nftTokenId);
        
        // Parse the docMemo to get share information
        let docMemoData: ShareDocMemoData;
        try {
          docMemoData = JSON.parse(documentInfo.docMemo);
        } catch (e) {
          throw new Error("Invalid document format.");
        }

        // Verify this is a shared document
        if (docMemoData.type !== 'shared' || !docMemoData.shareInfo) {
          throw new Error("This is not a shared document.");
        }

        // Extract encrypted partial key and IV
        const { encryptedPartialKey, iv: ivHex } = docMemoData.shareInfo;
        
        // Decrypt the partial key using the secret
        const partialKey = decryptPartialKey(encryptedPartialKey, secretKey);
        
        // Combine to get full key
        const fullKey = combineKey(partialKey, secretKey);
        
        // Import the key for decryption
        const aesKey = await importKeyFromHex(fullKey);
        
        // Convert IV from hex to Uint8Array
        const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        
        // Download encrypted content from IPFS
        const ipfsHash = documentInfo.storageAddress;
        const encryptedData = await downloadFromIPFS(ipfsHash);
        
        // Decrypt the content
        const decryptedContent = await decryptWithAES(encryptedData, aesKey, iv);
        
        // Set document information
        setDocumentTitle(docMemoData.metadata.fileName);
        setDocumentContent(decryptedContent);
        setSharedBy(docMemoData.shareInfo.sharedBy);
        setSharedAt(new Date(docMemoData.shareInfo.sharedAt).toLocaleString());
        
      } catch (error) {
        console.error('Failed to load shared document:', error);
        setError(error instanceof Error ? error.message : "Failed to load document.");
      } finally {
        setIsLoading(false);
      }
    };

    if (tokenId) {
      loadSharedDocument();
    }
  }, [tokenId]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="h-6 w-6 text-primary" />
          <h1 className="text-lg md:text-xl font-semibold">BlueDocs Viewer</h1>
        </div>
        <p className="text-sm text-muted-foreground">No wallet required</p>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Decrypting document...</p>
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="destructive" className="max-w-lg mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && documentContent && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center text-xl md:text-2xl">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                {documentTitle}
              </CardTitle>
              <CardDescription>
                Shared by: {sharedBy.substring(0, 6)}...{sharedBy.substring(38)} • {sharedAt}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {documentContent}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      
      <footer className="p-3 border-t text-center text-xs md:text-sm text-muted-foreground">
        End-to-end encrypted • Powered by IPFS & Blockchain
      </footer>
    </div>
  )
}
