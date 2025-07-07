'use client';

import { useState, useEffect } from 'react';
import * as nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';
import { ethers } from 'ethers';

// Declare ethereum type for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

// 合约ABI（仅包含createDocument方法和必要结构体）
const DOCUMENT_NFT_ABI = [
  "function createDocument(address _to, uint256 _amount, string _documentId, string _docUID, string _rootDocumentId, string _storageAddress, string _docMemo) external returns (uint256)",
  "function getCurrentTokenId() external view returns (uint256)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function getDocumentInfo(uint256 _tokenId) external view returns (tuple(string documentId, string docUID, string rootDocumentId, string storageAddress, string docMemo, uint256 createdAt, address creator))"
];

// 合约地址从环境变量读取
const DOCUMENT_NFT_ADDRESS = process.env.NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS;

export default function TestPage() {
  const [textInput, setTextInput] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [nonce, setNonce] = useState('');
  
  // Decrypt section state
  const [decryptHash, setDecryptHash] = useState('');
  const [decryptKey, setDecryptKey] = useState('');
  const [decryptNonce, setDecryptNonce] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  // MetaMask state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [encryptedKeys, setEncryptedKeys] = useState<{encryptedKey: string, encryptedNonce: string} | null>(null);

  // NFT list state
  const [nftList, setNftList] = useState<any[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState('');

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        setError('');
        
        // Get encryption public key
        await getEncryptionPublicKey(accounts[0]);
        
        // Load NFT list after connecting
        await loadNFTList();
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet');
    }
  };

  // Get encryption public key from MetaMask
  const getEncryptionPublicKey = async (address: string) => {
    try {
      const encryptionPublicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: [address],
      });
      
      setPublicKey(encryptionPublicKey);
      console.log('Encryption public key:', encryptionPublicKey);
    } catch (err) {
      console.error('Error getting encryption public key:', err);
      setError('Failed to get encryption public key');
    }
  };

  // Encrypt data using MetaMask public key
  const encryptWithMetaMask = async (data: string) => {
    if (!publicKey) {
      throw new Error('No public key available');
    }

    // Import the encryption library
    const { encrypt } = await import('@metamask/eth-sig-util');
    
    const encrypted = encrypt({
      publicKey,
      data,
      version: 'x25519-xsalsa20-poly1305',
    });

    // Convert to hex format for MetaMask compatibility
    return '0x' + Buffer.from(JSON.stringify(encrypted)).toString('hex');
  };

  // Decrypt data using MetaMask
  const decryptWithMetaMask = async (encryptedData: string) => {
    try {
      console.log('Attempting to decrypt with MetaMask...');
      console.log('Wallet address:', walletAddress);
      console.log('Encrypted data (hex):', encryptedData.substring(0, 100) + '...');
      
      // Log the exact parameters being sent to eth_decrypt
      console.log('=== eth_decrypt parameters ===');
      console.log('Encrypted data:', encryptedData);
      console.log('Account address:', walletAddress);
      console.log('Parameters array:', [encryptedData, walletAddress]);

      const decrypted = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedData, walletAddress],
      });
      
      console.log('MetaMask decryption successful:', decrypted);
      return decrypted;
    } catch (err) {
      console.error('Detailed MetaMask decryption error:', err);
      
      // More specific error messages
      if (err && typeof err === 'object') {
        const error = err as any;
        if ('code' in error) {
          switch (error.code) {
            case 4001:
              throw new Error('User rejected the decryption request');
            case -32602:
              throw new Error('Invalid parameters for decryption');
            case -32603:
              throw new Error('Internal MetaMask error during decryption');
            default:
              throw new Error(`MetaMask error (code ${error.code}): ${error.message || 'Unknown error'}`);
          }
        } else if ('message' in error) {
          throw new Error(`MetaMask decryption failed: ${error.message}`);
        }
      }
      
      throw new Error(`Failed to decrypt with MetaMask: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Check wallet connection on component mount
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            getEncryptionPublicKey(accounts[0]);
            // Load NFT list for connected wallet
            loadNFTList();
          }
        })
        .catch(console.error);
    }
  }, []);

  const encryptText = (text: string) => {
    // Generate a random 32-byte key for AES-256
    const key = nacl.randomBytes(32);
    // Generate a random 24-byte nonce for secretbox (not 12-byte like GCM)
    const nonceBytes = nacl.randomBytes(24);
    
    // Convert text to bytes
    const messageBytes = decodeUTF8(text);
    
    // Encrypt using secretbox (which uses XSalsa20-Poly1305, similar security to AES-256-GCM)
    const encrypted = nacl.secretbox(messageBytes, nonceBytes, key);
    
    // Combine nonce and encrypted data
    const combined = new Uint8Array(nonceBytes.length + encrypted.length);
    combined.set(nonceBytes);
    combined.set(encrypted, nonceBytes.length);
    
    return {
      encryptedData: combined,
      key: encodeBase64(key),
      nonce: encodeBase64(nonceBytes)
    };
  };

  const decryptData = (encryptedData: Uint8Array, keyB64: string, nonceB64: string) => {
    try {
      // Validate Base64 inputs
      if (!keyB64 || !nonceB64) {
        throw new Error('Key and nonce are required');
      }

      // Clean up Base64 strings (remove whitespace)
      const cleanKey = keyB64.trim();
      const cleanNonce = nonceB64.trim();

      console.log('Decryption debug info:');
      console.log('Key length:', cleanKey.length);
      console.log('Nonce length:', cleanNonce.length);
      console.log('Encrypted data length:', encryptedData.length);

      let key, nonce;
      
      try {
        key = decodeBase64(cleanKey);
        console.log('Decoded key length:', key.length);
      } catch (err) {
        throw new Error('Invalid encryption key format - must be valid Base64');
      }

      try {
        nonce = decodeBase64(cleanNonce);
        console.log('Decoded nonce length:', nonce.length);
      } catch (err) {
        throw new Error('Invalid nonce format - must be valid Base64');
      }

      // Validate key and nonce sizes
      if (key.length !== 32) {
        throw new Error(`Invalid key size: expected 32 bytes, got ${key.length}`);
      }
      
      if (nonce.length !== 24) {
        throw new Error(`Invalid nonce size: expected 24 bytes, got ${nonce.length}`);
      }

      // Check if we have enough data
      if (encryptedData.length < 24) {
        throw new Error('Encrypted data too short - missing nonce');
      }
      
      // Extract the encrypted content (skip the nonce at the beginning - 24 bytes)
      const encrypted = encryptedData.slice(24);
      console.log('Actual encrypted content length:', encrypted.length);
      
      // Decrypt
      const decrypted = nacl.secretbox.open(encrypted, nonce, key);
      
      if (!decrypted) {
        throw new Error('Decryption failed - invalid key, nonce, or corrupted data');
      }
      
      return encodeUTF8(decrypted);
    } catch (err) {
      console.error('Detailed decryption error:', err);
      throw new Error(`Decryption error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const uploadToIPFS = async () => {
    if (!textInput.trim()) {
      setError('Please enter some text');
      return;
    }

    if (!walletConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setIpfsHash('');
    setEncryptionKey('');
    setNonce('');
    setEncryptedKeys(null);

    try {
      // Encrypt the text
      const { encryptedData, key, nonce: nonceB64 } = encryptText(textInput);
      
      // Store the key and nonce for display
      setEncryptionKey(key);
      setNonce(nonceB64);

      // Encrypt the key and nonce with MetaMask
      const encryptedKey = await encryptWithMetaMask(key);
      const encryptedNonce = await encryptWithMetaMask(nonceB64);
      
      setEncryptedKeys({
        encryptedKey,
        encryptedNonce
      });

      // Create a FormData object with the encrypted content
      const formData = new FormData();
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      formData.append('file', blob, 'encrypted.bin');

      // Get Pinata JWT from environment variables
      const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT;

      if (!pinataJWT) {
        throw new Error('Pinata JWT not configured');
      }

      // Upload to IPFS via Pinata
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pinataJWT}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }

      const data = await response.json();
      setIpfsHash(data.IpfsHash);
      console.log('Pinata upload successful:', data);
    } catch (err) {
      console.error('IPFS upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload to IPFS');
    } finally {
      setLoading(false);
    }
  };

  const decryptFromIPFS = async () => {
    if (!decryptHash.trim() || !decryptKey.trim() || !decryptNonce.trim()) {
      setDecryptError('Please provide IPFS hash, encryption key, and nonce');
      return;
    }

    setDecryptLoading(true);
    setDecryptError('');
    setDecryptedText('');

    try {
      // Fetch encrypted data from IPFS
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${decryptHash}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const encryptedData = new Uint8Array(arrayBuffer);

      // Decrypt the data
      const decrypted = decryptData(encryptedData, decryptKey, decryptNonce);
      setDecryptedText(decrypted);
    } catch (err) {
      console.error('Decrypt error:', err);
      setDecryptError(err instanceof Error ? err.message : 'Failed to decrypt');
    } finally {
      setDecryptLoading(false);
    }
  };

  // Decrypt keys using MetaMask
  const decryptKeysWithMetaMask = async () => {
    if (!encryptedKeys || !walletConnected) {
      setDecryptError('No encrypted keys available or wallet not connected');
      return;
    }

    try {
      const decryptedKey = await decryptWithMetaMask(encryptedKeys.encryptedKey);
      const decryptedNonce = await decryptWithMetaMask(encryptedKeys.encryptedNonce);
      
      setDecryptKey(decryptedKey);
      setDecryptNonce(decryptedNonce);
      
      if (ipfsHash) {
        setDecryptHash(ipfsHash);
      }
    } catch (err) {
      console.error('Error decrypting keys:', err);
      setDecryptError('Failed to decrypt keys with MetaMask');
    }
  };

  // Mint NFT to wallet
  const mintDocumentNFT = async () => {
    if (!walletConnected) {
      setError('Please connect your wallet first');
      return;
    }
    if (!ipfsHash) {
      setError('Please upload to IPFS first');
      return;
    }
    if (!encryptionKey || !nonce) {
      setError('Encryption key and nonce are required');
      return;
    }
    if (!DOCUMENT_NFT_ADDRESS) {
      setError('DocumentNFT contract address not configured');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 获取provider和signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      // 合约实例
      const contract = new ethers.Contract(DOCUMENT_NFT_ADDRESS, DOCUMENT_NFT_ABI, signer);
      // 生成文档ID和UID（可用ipfsHash或时间戳等）
      const documentId = ipfsHash.substring(0, 8); // 简短ID
      const docUID = ipfsHash; // 唯一ID
      const rootDocumentId = ""; // 可选，留空
      const storageAddress = ipfsHash;
      const docMemo = `Key: ${encryptionKey}, Nonce: ${nonce}`;
      // 调用合约mint
      const tx = await contract.createDocument(walletAddress, 1, documentId, docUID, rootDocumentId, storageAddress, docMemo);
      await tx.wait();
      alert('NFT minted successfully!');
      // 刷新NFT列表
      await loadNFTList();
    } catch (err) {
      console.error('Mint NFT error:', err);
      setError(err instanceof Error ? err.message : 'Failed to mint NFT');
    } finally {
      setLoading(false);
    }
  };

  // Load NFT list for current wallet
  const loadNFTList = async () => {
    if (!walletConnected || !DOCUMENT_NFT_ADDRESS) {
      return;
    }

    setNftLoading(true);
    setNftError('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DOCUMENT_NFT_ADDRESS, DOCUMENT_NFT_ABI, provider);
      
      // 获取当前最大的tokenId
      const currentTokenId = await contract.getCurrentTokenId();
      const maxTokenId = Number(currentTokenId);
      
      const nfts = [];
      
      // 遍历所有可能的tokenId，检查当前钱包是否拥有
      for (let tokenId = 1; tokenId < maxTokenId; tokenId++) {
        try {
          const balance = await contract.balanceOf(walletAddress, tokenId);
          
          if (Number(balance) > 0) {
            // 获取NFT详细信息
            const docInfo = await contract.getDocumentInfo(tokenId);
            nfts.push({
              tokenId,
              balance: Number(balance),
              documentId: docInfo.documentId,
              docUID: docInfo.docUID,
              rootDocumentId: docInfo.rootDocumentId,
              storageAddress: docInfo.storageAddress,
              docMemo: docInfo.docMemo,
              createdAt: new Date(Number(docInfo.createdAt) * 1000),
              creator: docInfo.creator
            });
          }
        } catch (err) {
          // 忽略不存在的tokenId错误
          console.log(`Token ${tokenId} does not exist or error:`, err);
        }
      }
      
      setNftList(nfts);
    } catch (err) {
      console.error('Error loading NFT list:', err);
      setNftError('Failed to load NFT list');
    } finally {
      setNftLoading(false);
    }
  };

  return (
    <main style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <h1>MetaMask Encrypted IPFS Test Page</h1>
      <p>Upload encrypted text content to IPFS with MetaMask key protection</p>
      
      {/* Wallet Connection Section */}
      <div style={{ marginTop: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#f8f9fa' }}>
        <h2 style={{ margin: '0 0 16px', color: '#333' }}>🦊 MetaMask Connection</h2>
        
        {!walletConnected ? (
          <button
            onClick={connectWallet}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              backgroundColor: '#f6851b',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Connect MetaMask Wallet
          </button>
        ) : (
          <div>
            <p style={{ margin: '0 0 8px', color: '#28a745', fontWeight: 500 }}>
              ✅ Wallet Connected
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 14 }}>
              Address: <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3 }}>{walletAddress}</code>
            </p>
            {publicKey && (
              <p style={{ margin: '0 0 16px', fontSize: 14 }}>
                Public Key: <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>
                  {publicKey.substring(0, 20)}...
                </code>
              </p>
            )}
            
            {/* Test MetaMask Encryption Button */}
            <button
              onClick={async () => {
                try {
                  const testData = 'Test encryption: ' + Date.now();
                  console.log('Testing MetaMask encryption with:', testData);
                  
                  const encrypted = await encryptWithMetaMask(testData);
                  console.log('Encryption successful (hex format):', encrypted.substring(0, 100) + '...');
                  
                  const decrypted = await decryptWithMetaMask(encrypted);
                  console.log('Decryption successful:', decrypted);
                  
                  if (decrypted === testData) {
                    alert('✅ MetaMask encryption/decryption test passed!');
                  } else {
                    alert('❌ Test failed: decrypted data does not match original');
                  }
                } catch (err) {
                  console.error('Test failed:', err);
                  alert(`❌ Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
              }}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              🧪 Test MetaMask Encryption
            </button>
          </div>
        )}
      </div>

      {/* Encrypt & Upload Section */}
      <div style={{ marginTop: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 16px', color: '#333' }}>🔐 Encrypt & Upload</h2>
        
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter your text here..."
          style={{
            width: '100%',
            minHeight: 150,
            padding: 12,
            fontSize: 16,
            border: '1px solid #ccc',
            borderRadius: 4,
            fontFamily: 'inherit'
          }}
        />
        
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            onClick={uploadToIPFS}
            disabled={loading || !walletConnected}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              backgroundColor: loading || !walletConnected ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: loading || !walletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            {loading ? 'Encrypting & Uploading...' : 'Encrypt & Add to IPFS'}
          </button>
          <button
            onClick={mintDocumentNFT}
            disabled={loading || !walletConnected || !ipfsHash}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              backgroundColor: loading || !walletConnected || !ipfsHash ? '#ccc' : '#f6851b',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: loading || !walletConnected || !ipfsHash ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            🪙 Mint Document NFT
          </button>
        </div>
      </div>

      {/* Decrypt Section */}
      <div style={{ marginTop: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 16px', color: '#333' }}>🔓 Decrypt from IPFS</h2>
        
        {encryptedKeys && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 500 }}>🔑 MetaMask Encrypted Keys Available</p>
            <button
              onClick={decryptKeysWithMetaMask}
              disabled={!walletConnected}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                backgroundColor: '#f6851b',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: walletConnected ? 'pointer' : 'not-allowed',
                fontWeight: 500
              }}
            >
              🦊 Decrypt Keys with MetaMask
            </button>
          </div>
        )}
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>IPFS Hash:</label>
          <input
            type="text"
            value={decryptHash}
            onChange={(e) => setDecryptHash(e.target.value)}
            placeholder="Enter IPFS hash..."
            style={{
              width: '100%',
              padding: 12,
              fontSize: 16,
              border: '1px solid #ccc',
              borderRadius: 4
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Encryption Key (Base64):</label>
          <input
            type="text"
            value={decryptKey}
            onChange={(e) => setDecryptKey(e.target.value)}
            placeholder="Enter encryption key..."
            style={{
              width: '100%',
              padding: 12,
              fontSize: 16,
              border: '1px solid #ccc',
              borderRadius: 4
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Nonce (Base64):</label>
          <input
            type="text"
            value={decryptNonce}
            onChange={(e) => setDecryptNonce(e.target.value)}
            placeholder="Enter nonce..."
            style={{
              width: '100%',
              padding: 12,
              fontSize: 16,
              border: '1px solid #ccc',
              borderRadius: 4
            }}
          />
        </div>

        <button
          onClick={decryptFromIPFS}
          disabled={decryptLoading}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            backgroundColor: decryptLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: decryptLoading ? 'not-allowed' : 'pointer',
            fontWeight: 500
          }}
        >
          {decryptLoading ? 'Decrypting...' : 'Decrypt from IPFS'}
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: 4
        }}>
          Error: {error}
        </div>
      )}

      {decryptError && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: 4
        }}>
          Decrypt Error: {decryptError}
        </div>
      )}

      {encryptionKey && (
        <div style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#f0f9ff',
          borderRadius: 4,
          border: '1px solid #0070f3'
        }}>
          <h3 style={{ margin: '0 0 12px', color: '#0070f3' }}>🔐 Encryption Details</h3>
          
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 500 }}>Encryption Key (Base64):</p>
            <code style={{ 
              backgroundColor: '#e0e0e0', 
              padding: '8px 12px', 
              borderRadius: 4, 
              display: 'block',
              wordBreak: 'break-all',
              fontSize: '12px'
            }}>
              {encryptionKey}
            </code>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 500 }}>Nonce (Base64):</p>
            <code style={{ 
              backgroundColor: '#e0e0e0', 
              padding: '8px 12px', 
              borderRadius: 4, 
              display: 'block',
              wordBreak: 'break-all',
              fontSize: '12px'
            }}>
              {nonce}
            </code>
          </div>

          {encryptedKeys && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 500, color: '#f6851b' }}>🦊 MetaMask Encrypted Keys:</p>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#666' }}>
                These keys are encrypted with your MetaMask public key and can only be decrypted by your wallet.
              </p>
            </div>
          )}

          {ipfsHash && (
            <button
              onClick={() => {
                setDecryptHash(ipfsHash);
                setDecryptKey(encryptionKey);
                setDecryptNonce(nonce);
              }}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 500,
                marginBottom: 16
              }}
            >
              📋 Auto-fill Decrypt Form
            </button>
          )}

          <div style={{
            padding: 12,
            backgroundColor: '#fff3cd',
            borderRadius: 4,
            border: '1px solid #ffeaa7'
          }}>
            <p style={{ margin: 0, fontSize: 14, color: '#856404' }}>
              ⚠️ <strong>Important:</strong> Your encryption keys are now protected by MetaMask! You can use the "Decrypt Keys with MetaMask" button to retrieve them securely.
            </p>
          </div>
        </div>
      )}

      {ipfsHash && (
        <div style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#f0f9ff',
          borderRadius: 4
        }}>
          <p style={{ margin: 0, fontWeight: 500 }}>Upload successful!</p>
          <p style={{ margin: '8px 0 0' }}>
            IPFS Hash: <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3 }}>{ipfsHash}</code>
          </p>
          <p style={{ margin: '8px 0 0' }}>
            View encrypted file on IPFS Gateway:{' '}
            <a 
              href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0070f3' }}
            >
              https://gateway.pinata.cloud/ipfs/{ipfsHash}
            </a>
          </p>
          <p style={{ margin: '8px 0 0' }}>
            Alternative Gateway:{' '}
            <a 
              href={`https://ipfs.io/ipfs/${ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0070f3' }}
            >
              https://ipfs.io/ipfs/{ipfsHash}
            </a>
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#666' }}>
            Note: The file contains encrypted binary data and cannot be read without the encryption key.
          </p>
        </div>
      )}

      {decryptedText && (
        <div style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#d4edda',
          borderRadius: 4,
          border: '1px solid #28a745'
        }}>
          <h3 style={{ margin: '0 0 12px', color: '#28a745' }}>🔓 Decrypted Content</h3>
          <div style={{
            backgroundColor: 'white',
            padding: 12,
            borderRadius: 4,
            border: '1px solid #ccc',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace'
          }}>
            {decryptedText}
          </div>
        </div>
      )}

      {/* NFT List Section */}
      <div style={{ marginTop: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 16px', color: '#333' }}>🪙 My Document NFTs</h2>
        
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            onClick={loadNFTList}
            disabled={nftLoading || !walletConnected}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              backgroundColor: nftLoading || !walletConnected ? '#ccc' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: nftLoading || !walletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            {nftLoading ? '🔄 Loading...' : '🔄 Refresh NFT List'}
          </button>
          
          {walletConnected && (
            <span style={{ 
              padding: '10px 16px', 
              fontSize: 14, 
              backgroundColor: '#e3f2fd', 
              borderRadius: 4,
              color: '#1976d2'
            }}>
              Found {nftList.length} NFT(s)
            </span>
          )}
        </div>

        {nftError && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: 4
          }}>
            NFT Error: {nftError}
          </div>
        )}

        {!walletConnected ? (
          <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>
            Please connect your wallet to view your NFTs
          </p>
        ) : nftList.length === 0 && !nftLoading ? (
          <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>
            No Document NFTs found in your wallet
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {nftList.map((nft) => (
              <div
                key={nft.tokenId}
                style={{
                  padding: 16,
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  backgroundColor: '#fafafa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, color: '#333' }}>
                    NFT #{nft.tokenId} - {nft.documentId}
                  </h4>
                  <span style={{
                    padding: '4px 8px',
                    fontSize: 12,
                    backgroundColor: '#28a745',
                    color: 'white',
                    borderRadius: 12,
                    fontWeight: 500
                  }}>
                    Balance: {nft.balance}
                  </span>
                </div>
                
                <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Document UID:</strong> 
                    <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3, marginLeft: 8 }}>
                      {nft.docUID.length > 40 ? nft.docUID.substring(0, 40) + '...' : nft.docUID}
                    </code>
                  </p>
                  
                  <p style={{ margin: '4px 0' }}>
                    <strong>IPFS Hash:</strong> 
                    <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3, marginLeft: 8 }}>
                      {nft.storageAddress}
                    </code>
                  </p>
                  
                  <p style={{ margin: '4px 0' }}>
                    <strong>Created:</strong> {nft.createdAt.toLocaleString()}
                  </p>
                  
                  <p style={{ margin: '4px 0' }}>
                    <strong>Creator:</strong> 
                    <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3, marginLeft: 8 }}>
                      {nft.creator === walletAddress ? 'You' : nft.creator}
                    </code>
                  </p>
                  
                  {nft.docMemo && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Memo:</strong>
                      <div style={{
                        marginTop: 4,
                        padding: 8,
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        {nft.docMemo}
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${nft.storageAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      backgroundColor: '#0070f3',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: 4,
                      fontWeight: 500
                    }}
                  >
                    📁 View on IPFS
                  </a>
                  
                  <button
                    onClick={() => {
                      setDecryptHash(nft.storageAddress);
                      // 尝试解析memo中的key和nonce
                      if (nft.docMemo.includes('Key:') && nft.docMemo.includes('Nonce:')) {
                        const keyMatch = nft.docMemo.match(/Key:\s*([^,]+)/);
                        const nonceMatch = nft.docMemo.match(/Nonce:\s*(.+)/);
                        if (keyMatch) setDecryptKey(keyMatch[1].trim());
                        if (nonceMatch) setDecryptNonce(nonceMatch[1].trim());
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    🔓 Auto-fill Decrypt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 