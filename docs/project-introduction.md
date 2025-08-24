# BlueDoku - Decentralized Encrypted Document Manager

## What is BlueDoku?

BlueDoku is a privacy-first, decentralized document management platform that combines the power of blockchain technology, IPFS storage, and client-side encryption to provide users with a secure, censorship-resistant way to create, store, and share Markdown documents.

## 🔐 Core Philosophy

**Privacy is a norm.** BlueDoku ensures that your documents remain private and secure through end-to-end encryption, where only you control access to your content.

## ✨ Key Features

### 📝 Document Management
- **Markdown Editor**: Full-featured editor with real-time preview
- **Version Control**: Complete history tracking for all document changes
- **File Organization**: Intuitive file listing and management interface
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 🛡️ Security & Privacy
- **Client-side Encryption**: Documents are encrypted in your browser using AES-256-GCM
- **MetaMask Integration**: Encryption keys are protected by your MetaMask wallet
- **Zero-Knowledge Architecture**: No one can access your documents without your private key
- **Secure Sharing**: Share documents with cryptographic security

### 🌐 Decentralized Infrastructure
- **IPFS Storage**: Documents stored on the InterPlanetary File System
- **Optimism Blockchain**: Document ownership tracked via NFTs on Optimism L2
- **Wallet-based Authentication**: Connect with MetaMask for seamless user experience
- **No Central Servers**: Fully decentralized operation

### 🎯 User Experience
- **One-Click Publishing**: Publish documents directly to the blockchain
- **Instant Access**: View and edit your documents from any device
- **Mobile Optimized**: Full functionality on mobile browsers
- **Dark/Light Theme**: Adaptive UI for comfortable writing

## 🏗️ Technical Architecture

### Technology Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Blockchain**: Ethereum + Optimism L2 network
- **Storage**: IPFS (InterPlanetary File System)
- **Encryption**: TweetNaCl + Web Crypto API
- **Wallet**: MetaMask integration

### How BlueDoku Works

BlueDoku employs a sophisticated multi-layer security architecture to ensure your documents remain private and tamper-proof throughout their lifecycle.

**Step 1: Document Creation & Encryption**
When you create or edit a document, BlueDoku generates a unique AES-256 encryption key and nonce pair. Your document content is immediately encrypted client-side in your browser before any data transmission occurs. This ensures that plain text never leaves your device.

**Step 2: Key Protection via MetaMask**
The encryption key itself is protected using MetaMask's built-in encryption capabilities. Your MetaMask public key encrypts the document's AES key, ensuring only you can decrypt your content. This creates a secure key-wrapping mechanism where your wallet becomes the ultimate access control.

**Step 3: Decentralized Storage**
The encrypted document is uploaded to IPFS (InterPlanetary File System), receiving a unique content hash. Simultaneously, BlueDoku creates a document collection containing metadata about all your files, which is also encrypted and stored on IPFS. This dual-layer approach enables efficient file management while maintaining security.

**Step 4: Blockchain Ownership**
Finally, document ownership is recorded on the Optimism blockchain through NFTs. If you're a new user, a DocumentList NFT is created; existing users have their NFT updated with the new document reference. The blockchain stores the IPFS hash and encrypted key data, creating an immutable ownership record.

**Complete Security**
This architecture ensures that even if IPFS nodes are compromised, your documents remain encrypted. Only your MetaMask wallet can decrypt the keys needed to access your content, providing true digital sovereignty over your documents.

## 🚀 Getting Started

### Prerequisites
- **MetaMask Wallet**: Install MetaMask browser extension or mobile app
- **Optimism Network**: Ensure your wallet is connected to Optimism
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

### Quick Start
1. **Connect Wallet**: Click "Connect Wallet" and authorize MetaMask connection
2. **Create Document**: Click "New File" to start writing
3. **Edit Content**: Use the Markdown editor to write your document
4. **Publish**: Click "Publish" to encrypt and store your document on-chain
5. **Manage**: View, edit, or share your documents from the file list

## 🔗 Use Cases

### Personal Documentation
- Private notes and journals
- Research documentation
- Technical documentation
- Personal knowledge base

### Professional Use
- Confidential business documents
- Secure client communications
- Project documentation
- Team knowledge sharing

### Educational Content
- Course materials
- Student portfolios
- Research papers
- Educational resources

## 🌟 Why Choose BlueDoku?

### For Privacy-Conscious Users
- **True Ownership**: Your documents, your keys, your control
- **Censorship Resistance**: No central authority can block or delete your content
- **Privacy by Design**: End-to-end encryption ensures content privacy

### For Developers
- **Open Source**: Transparent, auditable codebase
- **Extensible**: Built with modern web technologies
- **Decentralized**: No vendor lock-in or platform dependency

### For Organizations
- **Compliance Ready**: Cryptographic security meets regulatory requirements
- **Cost Efficient**: No recurring storage or server costs
- **Future Proof**: Built on sustainable, decentralized infrastructure

## 🛣️ Roadmap

### Current Features (v1.0)
- ✅ Document creation and editing
- ✅ Client-side encryption
- ✅ IPFS storage integration
- ✅ NFT-based ownership
- ✅ Version control
- ✅ MetaMask integration

### Upcoming Features
- 🔄 Document sharing and collaboration
- 🔄 Advanced search capabilities
- 🔄 Plugin system for extensions
- 🔄 Multi-signature document approval
- 🔄 Integration with other blockchains

## 📚 Resources

- **Documentation**: Comprehensive guides and API references
- **GitHub Repository**: Open source codebase and issue tracking
- **Community**: Join our community for support and discussions

---

*BlueDoku empowers users to own their digital content in a truly decentralized and private manner. Start your journey towards digital sovereignty today.*
