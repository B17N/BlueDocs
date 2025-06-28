'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search } from 'lucide-react'
import { DOCUMENT_NFT_ABI, getContractAddress, parseDocMemoData, type NFTInfo, type DocMemoData } from '@/lib/contract'

export default function NFTListPage() {
  const [address, setAddress] = useState('')
  const [nfts, setNfts] = useState<NFTInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 创建 Infura provider
  const getInfuraProvider = () => {
    const infuraKey = process.env.NEXT_PUBLIC_INFURA_API_KEY
    const network = process.env.NEXT_PUBLIC_NETWORK
    
    if (!infuraKey) {
      throw new Error('Infura key not configured')
    }
    
    if (!network) {
      throw new Error('Network not configured')
    }
    
    // 根据网络配置构建 RPC URL
    let rpcUrl: string
    
    switch (network.toLowerCase()) {
      case 'sepolia':
        rpcUrl = `https://sepolia.infura.io/v3/${infuraKey}`
        break
      case 'mainnet':
        rpcUrl = `https://mainnet.infura.io/v3/${infuraKey}`
        break
      case 'polygon':
        rpcUrl = `https://polygon-mainnet.infura.io/v3/${infuraKey}`
        break
      case 'optimism':
        rpcUrl = `https://optimism-mainnet.infura.io/v3/${infuraKey}`
        break
      case 'arbitrum':
        rpcUrl = `https://arbitrum-mainnet.infura.io/v3/${infuraKey}`
        break
      default:
        throw new Error(`Unsupported network: ${network}`)
    }
    
    return new ethers.JsonRpcProvider(rpcUrl)
  }

  // 获取用户的 NFTs
  const fetchUserNFTs = async (userAddress: string) => {
    if (!ethers.isAddress(userAddress)) {
      setError('Invalid Ethereum address')
      return
    }

    setLoading(true)
    setError(null)
    setNfts([])

    try {
      const provider = getInfuraProvider()
      const contractAddress = getContractAddress()
      const contract = new ethers.Contract(contractAddress, DOCUMENT_NFT_ABI, provider)
      
      // 获取当前最大的 tokenId
      const currentTokenId = await contract.getCurrentTokenId()
      const maxTokenId = Number(currentTokenId)
      
      console.log('Max tokenId:', maxTokenId)
      
      const foundNFTs: NFTInfo[] = []
      
      // 遍历所有可能的 tokenId
      for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
        try {
          const balance = await contract.balanceOf(userAddress, tokenId)
          
          if (Number(balance) > 0) {
            // 获取 NFT 详细信息
            const docInfo = await contract.getDocumentInfo(tokenId)
            console.log(`Found NFT #${tokenId}:`, docInfo)
            
            foundNFTs.push({
              tokenId,
              balance: Number(balance),
              documentId: docInfo.documentId,
              docUID: docInfo.docUID,
              rootDocumentId: docInfo.rootDocumentId,
              storageAddress: docInfo.storageAddress,
              docMemo: docInfo.docMemo,
              createdAt: new Date(Number(docInfo.createdAt) * 1000),
              creator: docInfo.creator
            })
          }
        } catch (err) {
          console.log(`Token ${tokenId} error:`, err)
        }
      }
      
      setNfts(foundNFTs)
      
      if (foundNFTs.length === 0) {
        setError('No NFTs found for this address')
      }
    } catch (err) {
      console.error('Error fetching NFTs:', err)
      setError('Failed to fetch NFTs: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (address.trim()) {
      fetchUserNFTs(address.trim())
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDocumentMetadata = (docMemo: string): DocMemoData | null => {
    return parseDocMemoData(docMemo)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            NFT List Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Query document NFTs for any wallet address using Infura
          </p>
        </div>

        {/* Address Input */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Query NFTs by Address</CardTitle>
            <CardDescription>
              Enter a wallet address to view its document NFTs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="address" className="sr-only">
                  Wallet Address
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="0x..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={loading || !address.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* NFT List */}
        {nfts.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Found {nfts.length} NFT{nfts.length > 1 ? 's' : ''}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nft) => {
                const docData = getDocumentMetadata(nft.docMemo)
                
                return (
                  <Card key={nft.tokenId} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          NFT #{nft.tokenId}
                        </CardTitle>
                        <Badge variant="secondary">
                          {docData?.metadata?.fileType || 'Document'}
                        </Badge>
                      </div>
                      {docData?.metadata?.title && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {docData.metadata.title}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {docData?.metadata?.fileName && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">File Name</p>
                          <p className="text-sm font-medium">{docData.metadata.fileName}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">IPFS Hash</p>
                        <p className="font-mono text-xs break-all">{nft.storageAddress}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Creator</p>
                        <p className="font-mono text-xs break-all">{nft.creator}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                        <p className="text-sm">{formatDate(nft.createdAt)}</p>
                      </div>

                      {docData && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Versions</p>
                          <p className="text-sm">{docData.versions.length} version{docData.versions.length > 1 ? 's' : ''}</p>
                        </div>
                      )}

                      <div className="pt-3">
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => {
                            window.open(`https://gateway.pinata.cloud/ipfs/${nft.storageAddress}`, '_blank')
                          }}
                        >
                          View on IPFS
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  )
} 