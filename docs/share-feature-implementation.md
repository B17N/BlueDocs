# BlueDoku Share Feature Implementation

## Overview

The share feature in BlueDoku allows users to generate shareable links for their documents. The shared documents are encrypted with AES-256-GCM and stored on IPFS, with the decryption key split between the IPFS payload and the URL fragment for security.

## Architecture

### Key Components

1. **Share Encryption (`/lib/share-encryption.ts`)**
   - Implements AES-256-GCM encryption using the Web Crypto API
   - Handles key splitting (K1: 224 bits, K2: 32 bits)
   - Encrypts K1 with K2 for additional security

2. **Share Dialog (`/components/share-dialog.tsx`)**
   - User interface for generating share links
   - Displays the generated link with copy functionality
   - Shows security warnings about link sharing

3. **View Page (`/app/view/[fileId]/page.tsx`)**
   - Handles decryption and display of shared documents
   - Extracts the key from URL fragment
   - Renders documents in read-only mode with markdown support

4. **Editor Integration (`/components/editor-pane.tsx`)**
   - Share button integration
   - Handles the share workflow

## Security Model

### Encryption Flow

```
1. Generate 256-bit AES key (K)
2. Split K into:
   - K1: First 224 bits (28 bytes) - stored in IPFS
   - K2: Last 32 bits (4 bytes) - stored in URL fragment
3. Encrypt document and title with full key K
4. Encrypt K1 with K2 (using K2 padded to 256 bits)
5. Upload encrypted payload to IPFS
6. Generate URL: /view/{ipfsHash}#key={K2}
```

### Decryption Flow

```
1. Extract IPFS hash from URL path
2. Extract K2 from URL fragment
3. Download encrypted payload from IPFS
4. Decrypt K1 using K2
5. Reconstruct full key K = K1 + K2
6. Decrypt document content and title
```

## Implementation Details

### Share Payload Structure

```json
{
  "version": "1.0",
  "type": "shared-doc",
  "doc": "<Base64-encoded encrypted content>",
  "title": "<Base64-encoded encrypted title>",
  "key": "<Hex-encoded encrypted K1>",
  "iv": "<Hex-encoded IV>",
  "meta": {
    "fileType": "text/markdown",
    "createdAt": "2025-01-13T20:00:00Z"
  }
}
```

### Key Features

1. **No Wallet Required**: Shared documents can be viewed without connecting a wallet
2. **Read-Only Access**: Shared documents are view-only, cannot be edited
3. **Self-Contained Links**: All decryption information is in the URL
4. **IPFS Storage**: Documents are stored on IPFS for decentralized access

## Usage

### Sharing a Document

1. Open a document in the editor
2. Click the "Share" button
3. Click "Generate Share Link"
4. Copy the generated link
5. Send the link to recipients

### Viewing a Shared Document

1. Open the shared link in a browser
2. The document will automatically decrypt and display
3. No wallet connection required

## Security Considerations

1. **Link Security**: Anyone with the link can view the document
2. **Key in URL**: The decryption key is in the URL fragment (not sent to servers)
3. **No Access Control**: Once shared, access cannot be revoked
4. **IPFS Persistence**: Documents remain on IPFS until unpinned

## Technical Notes

### Browser Compatibility

- Requires Web Crypto API support
- Works in all modern browsers
- URL fragments are not sent in HTTP requests

### IPFS Integration

- Uses Pinata for IPFS pinning
- Documents are stored as JSON payloads
- Gateway access through `gateway.pinata.cloud`

## Future Enhancements

1. **Expiring Links**: Add time-based access control
2. **View Analytics**: Track document views
3. **Password Protection**: Additional layer of security
4. **Selective Sharing**: Share specific sections only 