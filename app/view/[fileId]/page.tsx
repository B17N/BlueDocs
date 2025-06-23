"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, FileText, ShieldAlert, LayoutPanelLeft } from "lucide-react"
import type { FileData } from "@/app/page" // Assuming FileData is exported from main page

// Mock data store - in a real app, this would be fetched from IPFS/backend
const mockGlobalFiles: FileData[] = [
  {
    id: "1",
    name: "My First Note.md",
    content: "# Hello World\n\nThis is my first encrypted note. It's now shared!",
    latestVersionTimestamp: "2024-06-22T10:00:00Z",
    versions: [
      {
        cid: "QmXyZ",
        txHash: "0xabc",
        timestamp: "2024-06-22T10:00:00Z",
        content: "# Hello World\n\nThis is my first encrypted note. It's now shared!",
      },
    ],
  },
  {
    id: "2",
    name: "Project Ideas.md",
    content: "## Brainstorming\n\n- Idea 1\n- Idea 2\n\nThis is a shared view.",
    latestVersionTimestamp: "2024-06-23T11:00:00Z",
    versions: [
      {
        cid: "QmZaB",
        txHash: "0x123",
        timestamp: "2024-06-23T11:00:00Z",
        content: "## Brainstorming\n\n- Idea 1\n- Idea 2\n\nThis is a shared view.",
      },
    ],
  },
  // Add more mock files if needed, matching IDs from your main page's mock data
]

// Mock access control: (fileId, allowedAddress)
// For simplicity, we'll assume if a file exists and wallet is connected, access is granted.
// A more robust mock:
// const mockPermissions = new Map<string, string[]>();
// mockPermissions.set("1", ["0xMockUserAddress1", "0xMockUserAddress2"]);

export default function SharedArticleViewPage() {
  const params = useParams()
  const fileId = params.fileId as string

  const [article, setArticle] = useState<FileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  useEffect(() => {
    if (fileId && isWalletConnected) {
      setIsLoading(true)
      setError(null)
      // Simulate fetching article data and checking permissions
      setTimeout(() => {
        const foundArticle = mockGlobalFiles.find((f) => f.id === fileId)
        if (foundArticle) {
          // Mock permission check: For now, if wallet is connected and file exists, grant access.
          // In a real app: check if walletAddress is in foundArticle.sharedWith or similar
          setArticle(foundArticle)
        } else {
          setError("Article not found or you do not have permission to view it.")
        }
        setIsLoading(false)
      }, 1000)
    } else if (fileId && !isWalletConnected) {
      // If fileId exists but wallet not connected, clear article and set loading to false
      setArticle(null)
      setIsLoading(false)
      setError(null) // Clear previous errors
    }
  }, [fileId, isWalletConnected, walletAddress])

  const handleConnectWallet = () => {
    setIsWalletConnected(true)
    setWalletAddress("0xMockUserAddress") // Mock connected address
  }

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false)
    setWalletAddress(null)
    setArticle(null) // Clear article data on disconnect
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Shared Article Viewer</h1>
        </div>
        <ConnectWalletButton
          isConnected={isWalletConnected}
          walletAddress={walletAddress}
          onConnect={handleConnectWallet}
          onDisconnect={handleDisconnectWallet}
        />
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {!isWalletConnected && (
          <Alert variant="default" className="max-w-lg mx-auto">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Connect Wallet</AlertTitle>
            <AlertDescription>Please connect your wallet to view the shared article.</AlertDescription>
          </Alert>
        )}

        {isWalletConnected && isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading article...</p>
          </div>
        )}

        {isWalletConnected && !isLoading && error && (
          <Alert variant="destructive" className="max-w-lg mx-auto">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied or Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isWalletConnected && !isLoading && article && (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                {article.name}
              </CardTitle>
              <CardDescription>
                Last updated: {new Date(article.latestVersionTimestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                {/* Using a simple pre for content display. Replace with react-markdown for rich preview */}
                <pre className="whitespace-pre-wrap break-words bg-muted/40 p-4 rounded-md">{article.content}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <footer className="p-3 border-t text-center text-sm text-muted-foreground">Content secured on Web3</footer>
    </div>
  )
}
