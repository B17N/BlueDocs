# BlueDocs Share Feature Implementation Plan

> **Key Updates in v1.3:**
> - Proper IV/nonce handling for AES-GCM (12 bytes)
> - Infura integration for wallet-free viewing
> - Environment variables configuration
> - Complete encryption flow with Web Crypto API

## 1. Overview

### 1.1 Background
The current BlueDocs system allows users to create and manage encrypted documents stored on IPFS with NFT-based ownership. We need to add a simple sharing mechanism that doesn't require wallet addresses or complex permission management.

### 1.2 Goals
- Enable one-click document sharing via URL
- No wallet connection required for viewers
- Maintain document security through key splitting and encryption
- Reuse existing NFT structure without contract modifications
- Ensure partial key in NFT is encrypted (not plaintext)

## 2. Technical Architecture

### 2.1 Core Concept
```
Document → AES Encrypt → IPFS → Split Key → NFT + URL → Share
```

### 2.2 Key Components
1. **AES-256-GCM Encryption**: Replace current NaCl encryption for shared documents
2. **Key Splitting**: 256-bit key split into 224-bit (stored in NFT) + 32-bit (in URL)
3. **NFT Storage**: Reuse existing DocumentNFT contract with special docMemo format
4. **URL Format**: `/view/{NFTtokenId}#key={secret}` using URL fragment

## 3. Implementation Details

### 3.1 Share Process Flow

1. **User initiates share**
   - Click "Share" button in EditorPane
   - System generates new AES-256 key (32 bytes = 64 hex chars)

2. **Encrypt document**
   - Use AES-256-GCM with generated key
   - Generate random IV/nonce (12 bytes for GCM, 96 bits)
   - Store IV in NFT docMemo (public, no need to encrypt)

3. **Upload to IPFS**
   - Upload encrypted content
   - Receive IPFS hash (becomes docUID)

4. **Split and encrypt key**
   - Full AES key: 32 bytes = 64 hex characters
   - Front part: First 56 hex characters (224 bits)
   - Secret part: Last 8 hex characters (32 bits) → Include in URL
   - **Security step**: Use secret part to encrypt front part before storing in NFT
   - Encrypted front part → Store in NFT (not plaintext!)

5. **Create share NFT**
   ```javascript
   {
     documentId: ipfsHash.substring(0, 8),
     docUID: ipfsHash,  // Full IPFS hash
     storageAddress: ipfsHash,
     docMemo: {
       version: "1.0-share",
       type: "shared",
       shareInfo: {
         encryptedPartialKey: encryptPartialKey(keyFront56, keyLast8),
         iv: ivHex,
         algorithm: "AES-256-GCM",
         keyEncryption: "XOR"
       }
     }
   }
   ```

   **Important**: After creating the NFT, we need to extract the tokenId from the transaction receipt:
   ```javascript
   // The createDocumentNFT function returns a transaction hash
   const txHash = await createDocumentNFT(params, wallet.address);
   
   // Get the transaction receipt to extract tokenId
   const provider = new ethers.BrowserProvider(window.ethereum);
   const receipt = await provider.getTransactionReceipt(txHash);
   
   // Parse the event logs to find DocumentCreated event
   const iface = new ethers.Interface(DOCUMENT_NFT_ABI);
   const logs = receipt.logs.map(log => {
     try {
       return iface.parseLog(log);
     } catch (e) {
       return null;
     }
   }).filter(Boolean);
   
   const event = logs.find(log => log.name === 'DocumentCreated');
   const tokenId = Number(event.args.tokenId);
   ```

6. **Generate share URL**
   ```
   https://app.bluedocs.com/view/{NFTtokenId}#key={keyLast8}
   ```

### 3.2 View Process Flow

1. **Extract parameters from URL**
   - Token ID from path: `/view/{NFTtokenId}`
   - Secret key from fragment: `#key={keyLast8}`

2. **Get NFT information**
   - Query blockchain using `getDocumentInfo(NFTtokenId)`
   - Use Infura provider for read-only access (no wallet needed)
   - Extract IPFS hash and encrypted partial key from NFT data
   - Infura API key stored in `.env.local`

3. **Reconstruct full key**
   - Extract encrypted partial key from NFT docMemo
   - Decrypt partial key using secret: `partialKey = decryptPartialKey(encryptedPartialKey, secretKey)`
   - Combine: `fullKey = partialKey + secretKey`

4. **Download and decrypt**
   - Fetch encrypted content from IPFS
   - Decrypt using AES-256-GCM with full key and IV

5. **Display document**
   - Render decrypted content in read-only view

## 4. Data Structures

### 4.1 Share NFT DocMemo Format
```typescript
interface ShareDocMemoData {
  version: "1.0-share";
  type: "shared";
  metadata: {
    fileName: string;
    fileType: string;
    title: string;
    createdAt: string;
    size: number;
    originalTokenId?: string;  // Reference to original doc if exists
  };
  shareInfo: {
    encryptedPartialKey: string;  // 56 hex chars encrypted with secret (not plaintext!)
    iv: string;                   // 24 hex chars (96 bits) for AES-GCM
    algorithm: "AES-256-GCM";
    keyEncryption: "XOR";         // Method used to encrypt partial key
    sharedBy: string;             // Sharer's wallet address
    sharedAt: string;             // ISO timestamp
  };
      versions: [{              // Single version for shared docs
      versionId: 1;
      ipfsHash: string;
      timestamp: string;
      size: number;
      encryptedKey: string;    // Same as encryptedPartialKey
      encryptedNonce: "SHARED_DOCUMENT";
    }];
  currentVersion: 1;
}
```

### 4.2 URL Structure
```
https://app.bluedocs.com/view/{NFTtokenId}#key={secretKey}

Example:
https://app.bluedocs.com/view/xsadasf23123#key=a7f3b9c2
```

