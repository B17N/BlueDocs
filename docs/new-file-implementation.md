# New File Feature Implementation

## Overview

The "New File" feature has been implemented with full integration to the decentralized document management system. When users create a new Markdown file, it follows a complete encryption and blockchain storage workflow.

## Key Features

### 1. Enhanced User Experience
- **Rich Default Template**: New files start with a helpful template explaining BlueDocs features
- **Smart File Naming**: Automatically extracts title from the first H1 heading
- **Real-time Feedback**: Toast notifications for each step of the publishing process

### 2. Security & Encryption
- **Local Encryption**: Uses TweetNaCl for AES-256 equivalent encryption
- **MetaMask Integration**: Encryption keys are protected by user's MetaMask public key
- **No Plain Text Storage**: All content is encrypted before leaving the browser

### 3. Decentralized Storage
- **IPFS Storage**: Encrypted content stored on IPFS via Pinata
- **Blockchain NFT**: Each document is minted as an NFT on Optimism
- **Structured Metadata**: Uses docMemo v1.0 format for rich metadata

## Implementation Details

### File Creation Flow

1. **User clicks "New File"**
   - Creates temporary file object with default content
   - Sets `isEditingNewFile` flag to true
   - Opens editor with the new file

2. **User edits content**
   - Real-time preview (desktop only)
   - Auto-save indicator shows "Unsaved" status
   - File name can be customized

3. **User clicks "Publish"**
   - Content encrypted with TweetNaCl
   - Keys encrypted with MetaMask public key
   - Uploaded to IPFS
   - NFT created with structured docMemo

### docMemo Structure (v1.0)

```json
{
  "version": "1.0",
  "metadata": {
    "fileName": "my-document.md",
    "fileType": "markdown",
    "title": "Extracted from first H1",
    "createdAt": "2024-01-01T00:00:00Z",
    "size": 1024,
    "isVisible": true
  },
  "encryption": {
    "encryptedKey": "0x...",
    "encryptedNonce": "0x...",
    "method": "metamask"
  }
}
```

### Code Changes

1. **app/page.tsx**
   - Integrated `useDocumentManager` hook
   - Replaced mock data with real NFT loading
   - Added proper error handling and toasts
   - Enhanced `handleNewFile` with better template
   - Implemented real `handleUpdateFile` with blockchain integration

2. **components/editor-pane.tsx**
   - Updated to handle async save operations
   - Added error handling for failed saves
   - Improved button state management

## Usage

1. Connect your MetaMask wallet
2. Click "New File" button
3. Edit the content in the Markdown editor
4. Customize the file name (optional)
5. Click "Publish" to save to IPFS and blockchain
6. File appears in your document list

## Technical Stack

- **Encryption**: TweetNaCl.js
- **Key Management**: MetaMask eth_getEncryptionPublicKey
- **Storage**: IPFS (via Pinata)
- **Blockchain**: Optimism
- **Smart Contract**: DocumentNFT (ERC1155)

## Benefits

- **Privacy**: Only the document owner can decrypt content
- **Persistence**: Documents stored permanently on IPFS
- **Ownership**: NFT proves ownership on blockchain
- **Version Control**: Each update creates a new version
- **No Central Server**: Fully decentralized architecture 