"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, FileText, ShieldAlert, LayoutPanelLeft, AlertCircle } from "lucide-react"
import { downloadFromIPFS } from "@/lib/ipfs"
import { decryptSharePayload, type SharePayload } from "@/lib/share-encryption"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

export default function SharedArticleViewPage() {
  const params = useParams()
  const fileId = params.fileId as string

  const [documentTitle, setDocumentTitle] = useState<string>("")
  const [documentContent, setDocumentContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string>("")

  useEffect(() => {
    const loadSharedDocument = async () => {
      if (!fileId) {
        setError("No document ID provided")
        setIsLoading(false)
        return
      }

      // Extract key from URL fragment
      const urlKey = window.location.hash.replace('#key=', '')
      
      if (!urlKey) {
        setError("No decryption key found in URL. This link may be invalid.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Fetch encrypted payload from IPFS
        const encryptedData = await downloadFromIPFS(fileId)
        
        // Parse the payload
        const payload: SharePayload = JSON.parse(
          new TextDecoder().decode(encryptedData)
        )
        
        // Validate payload structure
        if (!payload.version || !payload.type || payload.type !== 'shared-doc') {
          throw new Error("Invalid document format")
        }
        
        // Decrypt the document
        const { content, title } = await decryptSharePayload(payload, urlKey)
        
        setDocumentTitle(title)
        setDocumentContent(content)
        setCreatedAt(payload.meta.createdAt)
        
      } catch (error) {
        console.error("Error loading shared document:", error)
        if (error instanceof Error) {
          if (error.message.includes("decrypt")) {
            setError("Failed to decrypt document. The link may be invalid or corrupted.")
          } else if (error.message.includes("IPFS")) {
            setError("Failed to load document. It may have been removed or is temporarily unavailable.")
          } else {
            setError(error.message)
          }
        } else {
          setError("An unexpected error occurred while loading the document.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSharedDocument()
  }, [fileId])

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="h-6 w-6 text-primary" />
          <h1 className="text-lg md:text-xl font-semibold">BlueDoku - Shared Document</h1>
        </div>
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
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Error Loading Document</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && documentContent && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center text-xl md:text-2xl">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                {documentTitle || "Shared Document"}
              </CardTitle>
              <CardDescription>
                Shared on: {createdAt ? new Date(createdAt).toLocaleString() : "Unknown"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4 text-gray-600 dark:text-gray-400">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className
                      if (isInline) {
                        return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                      }
                      return <code className={className}>{children}</code>
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4 text-sm">
                        {children}
                      </pre>
                    ),
                    a: ({ children, href }) => (
                      <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 mb-4">
                        {children}
                      </table>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {documentContent}
                </ReactMarkdown>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Read-Only Access</AlertTitle>
                <AlertDescription>
                  This is a shared view of the document. The content is encrypted and can only be accessed with this unique link.
                </AlertDescription>
              </Alert>
            </div>
          </Card>
        )}
      </main>
      <footer className="p-3 border-t text-center text-xs md:text-sm text-muted-foreground">
        Encrypted content powered by IPFS & Web Crypto API
      </footer>
    </div>
  )
}
