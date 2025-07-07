# BlueDocs API Reference

This document provides a comprehensive guide to using the BlueDocs encrypted document management system.

## Quick Start

```typescript
import { useDocumentManager, BlueDocs } from '@/lib';

// Check if the system is properly configured
const isReady = BlueDocs.isConfigured();

// Use the document manager hook
const documentManager = useDocumentManager();
```

## Hooks

### useWallet()

Manages MetaMask wallet connection and encryption keys.

```typescript
const {
  isConnected,
  address,
  publicKey,
  isLoading,
  error,
  connectWallet,
  disconnectWallet,
  isMetaMaskInstalled
} = useWallet();
```

### useDocumentManager()

Provides complete document management functionality.

```typescript
const {
  // Wallet state
  wallet,
  
  // Operation states
  uploadState,
  decryptState,
  nftState,
  userNFTs,
  
  // Core functions
  encryptAndUpload,
  downloadAndDecrypt,
  downloadAndDecryptWithMetaMask,
  createDocumentNFT,
  publishDocument,
  
  // NFT functions
  loadUserNFTs,
  decryptDocumentFromNFT,
  getDocumentMetadataFromNFT,
  getVisibleNFTs,
  getHiddenNFTs,
  markDocumentAsHidden,
  restoreDocumentVisibility,
  
  // Utilities
  resetStates,
  isAnyLoading,
  hasAnyError,
  allErrors
} = useDocumentManager();
```

## Core Functions

### Encryption

```typescript
import { encryptText, decryptData } from '@/lib';

// Encrypt text
const result = encryptText("Hello World");
// Returns: { encryptedData: Uint8Array, key: string, nonce: string }

// Decrypt data
const decrypted = decryptData(result.encryptedData, result.key, result.nonce);
```

### MetaMask Encryption

```typescript
import { encryptWithMetaMask, decryptWithMetaMask } from '@/lib';

// Encrypt with MetaMask public key
const encrypted = await encryptWithMetaMask("secret data", publicKey);

// Decrypt with MetaMask
const decrypted = await decryptWithMetaMask(encrypted, walletAddress);
```

### IPFS Operations

```typescript
import { uploadToIPFS, downloadFromIPFS } from '@/lib';

// Upload encrypted data
const result = await uploadToIPFS(encryptedData, {
  fileName: 'document.bin',
  metadata: { encrypted: true }
});

// Download from IPFS
const data = await downloadFromIPFS(ipfsHash);
```

### Smart Contract

```typescript
import { 
  mintDocumentFromIPFS, 
  getUserNFTs, 
  updateDocumentMemo,
  parseDocMemoData 
} from '@/lib';

// Create document NFT
const txHash = await mintDocumentFromIPFS(
  ipfsHash,
  encryptionKey,
  nonce,
  walletAddress,
  metadata,
  encryptedKeys
);

// Get user's NFTs
const nfts = await getUserNFTs(walletAddress);

// Update document memo (for soft delete or other updates)
const updateTxHash = await updateDocumentMemo(
  tokenId,
  newMemoString,
  walletAddress
);

// Parse structured memo data
const docData = parseDocMemoData(nft.docMemo);
if (docData) {
  console.log(docData.metadata.fileName, docData.metadata.isVisible);
}
```

## Complete Workflows

### Publishing a Document

```typescript
const documentManager = useDocumentManager();

// Method 1: One-step publish
const result = await documentManager.publishDocument(
  "# My Document\n\nContent here...",
  true, // Create NFT
  "my-document.md" // Optional filename
);

// Method 2: Step-by-step
const uploadResult = await documentManager.encryptAndUpload(content);
const txHash = await documentManager.createDocumentNFT(
  uploadResult,
  content,
  "my-document.md" // Optional filename
);
```

### Reading a Document

```typescript
// Method 1: From IPFS hash + keys
const document = await documentManager.downloadAndDecrypt(
  ipfsHash,
  encryptionKey,
  nonce
);

// Method 2: From NFT
await documentManager.loadUserNFTs();
const nft = documentManager.userNFTs[0];
const document = await documentManager.decryptDocumentFromNFT(nft);

// Method 3: Using MetaMask encrypted keys
const document = await documentManager.downloadAndDecryptWithMetaMask(
  ipfsHash,
  encryptedKey,
  encryptedNonce
);

// Method 4: Get document metadata from NFT
const metadata = documentManager.getDocumentMetadataFromNFT(nft);
console.log(metadata.fileName, metadata.title, metadata.fileType);

// Method 5: Get only visible documents (filter out soft-deleted)
const visibleNFTs = documentManager.getVisibleNFTs();

// Method 6: Get hidden documents (soft-deleted)
const hiddenNFTs = documentManager.getHiddenNFTs();

// Method 7: Soft delete a document (updates blockchain)
await documentManager.markDocumentAsHidden(nft);

// Method 8: Restore a hidden document (updates blockchain)
await documentManager.restoreDocumentVisibility(nft);
```

## Document Utilities

```typescript
import {
  generateDocumentMetadata,
  generateFileName,
  validateDocumentContent,
  formatFileSize,
  formatDateTime
} from '@/lib';

// Generate metadata
const metadata = generateDocumentMetadata(content, "document.md");

// Generate filename from content
const filename = generateFileName(content);

// Validate content
const validation = validateDocumentContent(content);
if (!validation.isValid) {
  console.error(validation.errors);
}

// Format utilities
const size = formatFileSize(1024); // "1 KB"
const time = formatDateTime(new Date().toISOString()); // "just now"
```

## Error Handling

All functions throw descriptive errors. Use try-catch blocks:

```typescript
try {
  const result = await documentManager.publishDocument(content);
  console.log('Success:', result);
} catch (error) {
  console.error('Failed to publish:', error.message);
}
```

## Environment Variables

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS=0x...contract_address
```

## Types

### DocumentUploadResult
```typescript
interface DocumentUploadResult {
  ipfsHash: string;
  encryptionKey: string;
  nonce: string;
  encryptedKeys?: {
    encryptedKey: string;
    encryptedNonce: string;
  };
}
```

### DocumentDecryptResult
```typescript
interface DocumentDecryptResult {
  content: string;
  metadata?: {
    ipfsHash: string;
    encryptionKey: string;
    nonce: string;
  };
}
```

### DocumentMetadataForNFT
```typescript
interface DocumentMetadataForNFT {
  fileName: string;
  fileType: string;
  title: string;
  createdAt: string;
  size: number;
  isVisible: boolean; // 用于实现假删除功能
}
```

### DocMemoData
```typescript
interface DocMemoData {
  version: string;
  metadata: DocumentMetadataForNFT;
  encryption: {
    encryptedKey: string;
    encryptedNonce: string;
    method: string; // "metamask" | "plaintext"
  };
}
```

### NFTInfo
```typescript
interface NFTInfo {
  tokenId: number;
  balance: number;
  documentId: string;
  docUID: string;
  rootDocumentId: string;
  storageAddress: string;
  docMemo: string; // Now contains structured JSON data
  createdAt: Date;
  creator: string;
}
```

## DocMemo Format (v1.0)

The new structured docMemo format provides enhanced metadata and security:

### Structure
```json
{
  "version": "1.0",
  "metadata": {
    "fileName": "document.md",
    "fileType": "markdown",
    "title": "Document Title",
    "createdAt": "2024-01-01T00:00:00Z",
    "size": 1024,
    "isVisible": true
  },
  "encryption": {
    "encryptedKey": "metamask_encrypted_key",
    "encryptedNonce": "metamask_encrypted_nonce",
    "method": "metamask"
  }
}
```

### Features
- **Structured metadata**: File name, type, title, creation time, size, and visibility flag
- **MetaMask encryption**: Encryption keys are encrypted with user's public key
- **Soft delete support**: `isVisible` field enables soft deletion without losing blockchain data
- **Backward compatibility**: Automatically handles old format docMemos
- **Version tracking**: Format version for future upgrades

### Parsing Functions
```typescript
import { parseDocMemoData, parseEncryptionInfoFromMemo } from '@/lib';

// Parse new format
const docData = parseDocMemoData(nft.docMemo);
if (docData) {
  console.log(docData.metadata.fileName);
  console.log(docData.encryption.method);
}

// Legacy compatibility
const encryptionInfo = parseEncryptionInfoFromMemo(nft.docMemo);
```

## Soft Delete Feature

Since blockchain data cannot be truly deleted, BlueDocs implements a soft delete mechanism:

### Usage
```typescript
// Get only visible documents (recommended for UI)
const visibleDocuments = documentManager.getVisibleNFTs();

// Soft delete a document
await documentManager.markDocumentAsHidden(nft);

// Check if a document is visible
const metadata = documentManager.getDocumentMetadataFromNFT(nft);
if (metadata.isVisible) {
  // Show in UI
} else {
  // Hidden from normal view
}
```

### Important Notes
- **Blockchain persistence**: Updates are written to the blockchain via smart contract
- **Gas costs**: Each hide/restore operation requires a blockchain transaction and gas fees
- **Authorization**: Only NFT owners can hide/restore their documents
- **Data preservation**: Hidden documents remain on blockchain and can always be recovered
- **Real-time updates**: Changes are immediately reflected across all sessions

## Configuration Check

```typescript
import { BlueDocs } from '@/lib';

// Check if everything is configured
if (BlueDocs.isConfigured()) {
  console.log('✅ System ready');
} else {
  const status = BlueDocs.getConfigStatus();
  console.log('Configuration status:', status);
}
``` 