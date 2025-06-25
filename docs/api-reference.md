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
import { mintDocumentFromIPFS, getUserNFTs } from '@/lib';

// Create document NFT
const txHash = await mintDocumentFromIPFS(
  ipfsHash,
  encryptionKey,
  nonce,
  walletAddress
);

// Get user's NFTs
const nfts = await getUserNFTs(walletAddress);
```

## Complete Workflows

### Publishing a Document

```typescript
const documentManager = useDocumentManager();

// Method 1: One-step publish
const result = await documentManager.publishDocument(
  "# My Document\n\nContent here...",
  true // Create NFT
);

// Method 2: Step-by-step
const uploadResult = await documentManager.encryptAndUpload(content);
const txHash = await documentManager.createDocumentNFT(uploadResult);
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

### NFTInfo
```typescript
interface NFTInfo {
  tokenId: number;
  balance: number;
  documentId: string;
  docUID: string;
  rootDocumentId: string;
  storageAddress: string;
  docMemo: string;
  createdAt: Date;
  creator: string;
}
```

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