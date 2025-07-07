# Version Control Feature Implementation

## Overview

The version control feature has been implemented to manage document versions within a single NFT, rather than creating multiple NFTs for each version. This approach is more gas-efficient and provides better organization.

## Key Features

### 1. **Single NFT Per Document**
- Each document is represented by one NFT
- All versions are stored in the `docMemo` field as structured JSON
- Updates modify the existing NFT rather than creating new ones

### 2. **Version Structure**
```typescript
interface DocMemoData {
  version: "1.0";
  metadata: {
    fileName: string;
    fileType: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    size: number;
    isVisible: boolean;
  };
  versions: DocumentVersion[];
  currentVersion: number;
}

interface DocumentVersion {
  versionId: number;        // Incremental: 1, 2, 3...
  ipfsHash: string;         // IPFS hash for this version
  timestamp: string;        // Creation timestamp
  size: number;            // Size in bytes
  encryptedKey: string;    // Encryption key
  encryptedNonce: string;  // Encryption nonce
}
```

### 3. **Version Management**
- **Version IDs**: Start from 1 and increment sequentially
- **Current Version**: Points to the active version
- **File Display**: Shows version number in filename: `document.md (v3)`
- **Update Timestamp**: Tracks when document was last modified

## Implementation Details

### Core Functions

#### A. **updateDocument()**
- Encrypts new content and uploads to IPFS
- Creates new version entry in the versions array
- Updates currentVersion pointer
- Calls smart contract to update docMemo

#### B. **restoreVersion()**
- Finds the specified historical version
- Decrypts the old content
- Re-encrypts and uploads as new version
- Creates new version ID (doesn't overwrite history)

#### C. **getVersionHistory()**
- Extracts versions array from docMemo
- Returns versions sorted by ID (newest first)

### User Interface

#### A. **File List**
- Displays files with version numbers: `document.md (v3)`
- Shows last updated timestamp
- Loads current version content

#### B. **History Viewer**
- Lists all versions with details (size, timestamp, IPFS hash)
- Supports content preview with decryption
- "Restore This Version" button for non-current versions
- Shows loading states during decryption and restore operations

#### C. **Editor**
- Update button creates new version automatically
- Success messages include version information
- Integrates seamlessly with existing edit workflow

## Technical Benefits

### 1. **Gas Efficiency**
- Single NFT creation per document
- Updates only modify docMemo (cheaper than new NFT)
- Efficient storage of version metadata

### 2. **Data Integrity**
- Complete version history preserved
- No data loss during updates
- Immutable historical versions

### 3. **User Experience**
- Clear version numbering
- Easy version restoration
- Intuitive interface

### 4. **Scalability**
- No limit on version count
- Efficient blockchain storage
- Fast version retrieval

## Usage Flow

### Creating First Version
```
User creates document → Version 1 → currentVersion = 1
```

### Updating Document
```
User edits content → New IPFS upload → Version 2 → currentVersion = 2
```

### Restoring Version
```
User selects v1 in history → Content decrypted → Re-encrypted → Version 3 (copy of v1) → currentVersion = 3
```

## Error Handling

- **Decryption Failures**: Graceful error messages
- **Network Issues**: Retry mechanisms for IPFS operations
- **Contract Errors**: Clear error reporting
- **Loading States**: Visual feedback during operations

## Future Enhancements

- **Version Comparison**: Side-by-side diff view
- **Branching**: Support for document forks
- **Compression**: Optimize docMemo size for many versions
- **Batch Operations**: Bulk version management

## Testing

The implementation includes comprehensive error handling and state management for:
- Creating new documents
- Updating existing documents
- Viewing version history
- Restoring historical versions
- Network and decryption error scenarios

All operations maintain data consistency and provide clear user feedback.

## Encryption Optimization (v2.0)

Starting from December 2024, BlueDocs implements an improved encryption scheme to enhance user experience:

#### Problem with Previous Approach
- Key and Nonce were encrypted separately using MetaMask
- Users had to confirm **two separate transactions** in MetaMask for each encryption/decryption operation
- This created friction and confusion in the user experience

#### New Optimized Approach
- Key and Nonce are **combined into a single JSON object** before MetaMask encryption
- Users now only need to confirm **one transaction** in MetaMask
- Significantly improved user experience while maintaining the same level of security

#### Technical Implementation

**New Encryption Format:**
```typescript
// Combine key and nonce into single object
const combinedKeys = JSON.stringify({ key, nonce });
const encryptedCombined = await encryptWithMetaMask(combinedKeys, publicKey);

// Store with special marker
{
  encryptedKey: encryptedCombined,
  encryptedNonce: "COMBINED_FORMAT" // Special marker to identify new format
}
```

**New Decryption Logic:**
```typescript
// Check format by nonce field
if (version.encryptedNonce === "COMBINED_FORMAT") {
  // New format: single MetaMask call
  const decryptedCombined = await decryptWithMetaMask(version.encryptedKey, address);
  const { key, nonce } = JSON.parse(decryptedCombined);
} else {
  // Legacy format: separate calls (backward compatibility)
  const key = await decryptWithMetaMask(version.encryptedKey, address);
  const nonce = await decryptWithMetaMask(version.encryptedNonce, address);
}
```

#### Backward Compatibility
- The system automatically detects format based on the `encryptedNonce` field
- Old documents with separate encryption continue to work seamlessly
- New documents use the optimized single-encryption format
- Users experience the improvement immediately for new documents

#### Benefits
1. **Improved UX**: Only one MetaMask confirmation needed instead of two
2. **Faster Operations**: Reduced time for encryption/decryption operations  
3. **Lower Gas Usage**: Fewer blockchain interactions for MetaMask operations
4. **Seamless Migration**: No manual migration required for existing documents

This optimization maintains full security while significantly improving the user experience for document encryption and decryption operations. 