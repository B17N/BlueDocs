# BlueDoku Share Feature Technical Flow

This document describes the technical flow for sharing documents in the BlueDoku system.

## Overview

The BlueDoku share feature enables users to generate shareable links for their documents without requiring recipients to have a wallet. It uses advanced key splitting technology and client-side encryption to maintain security while providing convenient access.

## Technical Flow Diagram

```mermaid
graph TD
    A[User Clicks Share Button] --> B[Select Document to Share]
    B --> C[Step 1: Generate Share Key]
    
    C --> D[Generate 256-bit AES Key K]
    D --> E[Split Key:<br/>K1=First 224 bits, K2=Last 32 bits]
    E --> F[Step 2: Document Encryption]
    
    F --> G[Encrypt Document Content with Full Key K]
    G --> H[Encrypt Document Title with Full Key K]
    H --> I[Step 3: Key Protection]
    
    I --> J[Encrypt K1 with K2<br/>for Enhanced Security]
    J --> K[Step 4: Build Share Payload]
    
    K --> L["Create SharePayload JSON:<br/>{<br/>  doc: Encrypted Content,<br/>  title: Encrypted Title,<br/>  key: Encrypted K1,<br/>  iv: Initialization Vector<br/>}"]
    L --> M[Step 5: IPFS Storage]
    
    M --> N[Upload SharePayload to IPFS]
    N --> O[Get IPFS Hash]
    O --> P[Step 6: Generate Share Link]
    
    P --> Q["Build URL:<br/>/view/{ipfsHash}#key={K2}"]
    Q --> R[User Copies and Shares Link]
    
    R --> S[=== Viewing Process ===]
    S --> T[Recipient Opens Share Link]
    T --> U[Extract IPFS Hash and K2 from URL]
    U --> V[Step 7: Download and Decrypt]
    
    V --> W[Download SharePayload from IPFS]
    W --> X[Decrypt K1 using K2]
    X --> Y[Reconstruct Full Key K = K1 + K2]
    Y --> Z[Decrypt Document Content and Title with K]
    Z --> AA[Step 8: Render Display]
    
    AA --> BB[View Document without Wallet]
    
    CC[IPFS Network<br/>Store Share Payload] -.-> N
    DD[URL Fragment<br/>Not Sent to Server] -.-> Q
    
    subgraph Encryption ["Encryption Layer"]
        F
        I
        X
    end
    
    subgraph KeySplit ["Key Splitting Strategy"]
        E
        J
        Y
    end
    
    subgraph WalletFree ["Wallet-free Access"]
        T
        U
        V
        W
        BB
    end
    
    style A fill:#e1f5fe
    style BB fill:#c8e6c9
    style E fill:#fff3e0
    style J fill:#fff3e0
    style Y fill:#fff3e0
    style DD fill:#ffebee
```

## Process Description

### Share Creation Process

#### Step 1: Generate Share Key
- System generates a secure 256-bit AES encryption key
- Key is split into two parts: K1 (224 bits) and K2 (32 bits)
- This splitting strategy enables secure key distribution

#### Step 2: Document Encryption
- Document content is encrypted using the full 256-bit key
- Document title is separately encrypted with the same key
- All encryption occurs client-side for maximum security

#### Step 3: Key Protection
- K1 (the larger key portion) is encrypted using K2
- This adds an additional layer of security to prevent key reconstruction
- Creates dependency between both key parts

#### Step 4: Build Share Payload
- Creates a structured JSON payload containing:
  - Encrypted document content (Base64 encoded)
  - Encrypted document title (Base64 encoded)
  - Encrypted K1 key portion (hex encoded)
  - Initialization vector for decryption

#### Step 5: IPFS Storage
- Share payload is uploaded to IPFS network
- Content is distributed across decentralized nodes
- IPFS hash provides content-addressable storage

#### Step 6: Generate Share Link
- URL format: `/view/{ipfsHash}#key={K2}`
- K2 is stored in URL fragment (after #)
- URL fragments are not sent to servers, enhancing security

### Document Viewing Process

#### Step 7: Download and Decrypt
- Recipient's browser extracts IPFS hash from URL path
- K2 key portion is extracted from URL fragment
- SharePayload is downloaded from IPFS using the hash
- K1 is decrypted using K2 to reconstruct the full key

#### Step 8: Render Display
- Document content and title are decrypted using the full key
- Content is rendered in read-only mode
- No wallet connection required for viewing

## Security Features

### Key Splitting Technology
1. **256-bit Key Division**: Full encryption key split into K1 (224 bits) + K2 (32 bits)
2. **Distributed Storage**: K1 stored encrypted in IPFS, K2 in URL fragment
3. **Dependency Encryption**: K1 encrypted with K2, preventing independent use

### URL Fragment Security
1. **Client-side Only**: URL fragments (#key=...) never sent to servers
2. **Browser Isolation**: Key portion remains in user's browser
3. **No Server Logging**: Prevents key exposure in server logs

### Access Control
1. **Link-based Access**: Anyone with the complete link can view
2. **No Revocation**: Once shared, access cannot be remotely revoked
3. **Read-only Access**: Shared documents cannot be edited

## Technical Advantages

1. **Wallet-free Viewing**: Recipients don't need MetaMask or any wallet
2. **Client-side Encryption**: All cryptographic operations in browser
3. **Decentralized Storage**: No central server dependencies
4. **Instant Sharing**: One-click link generation
5. **Cross-platform Access**: Works on any device with web browser

## Technologies Used

- **Encryption**: AES-256-GCM with Web Crypto API
- **Key Management**: Custom key splitting algorithm
- **Storage**: IPFS via Pinata gateway
- **Frontend**: React with TypeScript
- **Cryptography**: Web Crypto API for browser-native encryption

## Use Cases

- **Document Collaboration**: Share drafts for review
- **Public Documentation**: Distribute guides and tutorials
- **Academic Papers**: Share research without barriers
- **Blog Posts**: Distribute content widely
- **Legal Documents**: Share contracts for review 