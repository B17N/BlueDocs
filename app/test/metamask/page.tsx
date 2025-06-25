'use client';

import { useState, useEffect } from 'react';

// Declare ethereum type for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function MetaMaskTestPage() {
  // MetaMask state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [error, setError] = useState('');
  
  // Test data
  const [testInput, setTestInput] = useState('Hello MetaMask Encryption!');
  const [encryptedData, setEncryptedData] = useState('');
  const [decryptedData, setDecryptedData] = useState('');
  const [loading, setLoading] = useState(false);

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
      console.log('Encryption public key obtained:', encryptionPublicKey);
    } catch (err) {
      console.error('Error getting encryption public key:', err);
      setError('Failed to get encryption public key. Make sure MetaMask is unlocked.');
    }
  };

  // Encrypt data using MetaMask public key
  const encryptWithMetaMask = async (data: string) => {
    if (!publicKey) {
      throw new Error('No public key available');
    }

    console.log('Encrypting data:', data);
    console.log('Using public key:', publicKey);

    try {
      // Import the encryption library
      const { encrypt } = await import('@metamask/eth-sig-util');
      
      const encrypted = encrypt({
        publicKey,
        data,
        version: 'x25519-xsalsa20-poly1305',
      });

      console.log('Encryption successful:', encrypted);
      return JSON.stringify(encrypted);
    } catch (err) {
      console.error('Encryption error:', err);
      throw new Error(`Encryption failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Decrypt data using MetaMask
  const decryptWithMetaMask = async (encryptedData: string) => {
    try {
      console.log('Attempting to decrypt with MetaMask...');
      console.log('Wallet address:', walletAddress);
      console.log('Encrypted data:', encryptedData);
      
      // Parse the encrypted data to validate format
      let parsedData;
      try {
        parsedData = JSON.parse(encryptedData);
        console.log('Parsed encrypted data structure:', {
          version: parsedData.version,
          nonce: parsedData.nonce?.substring(0, 20) + '...',
          ephemPublicKey: parsedData.ephemPublicKey?.substring(0, 20) + '...',
          ciphertext: parsedData.ciphertext?.substring(0, 20) + '...'
        });
      } catch (parseErr) {
        console.error('Failed to parse encrypted data:', parseErr);
        throw new Error('Invalid encrypted data format - not valid JSON');
      }

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

  // Test encryption
  const testEncryption = async () => {
    if (!testInput.trim()) {
      setError('Please enter some test data');
      return;
    }

    setLoading(true);
    setError('');
    setEncryptedData('');
    setDecryptedData('');

    try {
      const encrypted = await encryptWithMetaMask(testInput);
      setEncryptedData(encrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setLoading(false);
    }
  };

  // Test decryption
  const testDecryption = async () => {
    if (!encryptedData) {
      setError('No encrypted data to decrypt');
      return;
    }

    setLoading(true);
    setError('');
    setDecryptedData('');

    try {
      const decrypted = await decryptWithMetaMask(encryptedData);
      setDecryptedData(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setLoading(false);
    }
  };

  // Full round-trip test
  const testRoundTrip = async () => {
    if (!testInput.trim()) {
      setError('Please enter some test data');
      return;
    }

    setLoading(true);
    setError('');
    setEncryptedData('');
    setDecryptedData('');

    try {
      console.log('Starting round-trip test...');
      
      // Step 1: Encrypt
      const encrypted = await encryptWithMetaMask(testInput);
      setEncryptedData(encrypted);
      console.log('Encryption step completed');

      // Step 2: Decrypt
      const decrypted = await decryptWithMetaMask(encrypted);
      setDecryptedData(decrypted);
      console.log('Decryption step completed');

      // Step 3: Verify
      if (decrypted === testInput) {
        alert('✅ Round-trip test successful! Data matches perfectly.');
      } else {
        setError(`❌ Round-trip test failed! Original: "${testInput}", Decrypted: "${decrypted}"`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Round-trip test failed');
    } finally {
      setLoading(false);
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
          }
        })
        .catch(console.error);
    }
  }, []);

  return (
    <main style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <h1>🦊 MetaMask Encryption/Decryption Test</h1>
      <p>Debug and test MetaMask encryption functionality</p>

      {/* MetaMask Status */}
      <div style={{ marginBottom: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#f8f9fa' }}>
        <h2 style={{ margin: '0 0 16px', color: '#333' }}>Connection Status</h2>
        
        {!isMetaMaskInstalled() && (
          <div style={{ padding: 12, backgroundColor: '#fee', color: '#c00', borderRadius: 4, marginBottom: 16 }}>
            ❌ MetaMask is not installed
          </div>
        )}

        {!walletConnected ? (
          <button
            onClick={connectWallet}
            disabled={!isMetaMaskInstalled()}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              backgroundColor: !isMetaMaskInstalled() ? '#ccc' : '#f6851b',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: !isMetaMaskInstalled() ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            Connect MetaMask
          </button>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', color: '#28a745', fontWeight: 500 }}>
                ✅ Wallet Connected
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 14 }}>
                Address: <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3 }}>{walletAddress}</code>
              </p>
              {publicKey ? (
                <p style={{ margin: '0', fontSize: 14 }}>
                  Public Key: <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>
                    {publicKey.substring(0, 40)}...
                  </code>
                </p>
              ) : (
                <p style={{ margin: '0', fontSize: 14, color: '#dc3545' }}>
                  ❌ No encryption public key available
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test Input */}
      <div style={{ marginBottom: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 16px', color: '#333' }}>Test Data</h2>
        
        <textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="Enter test data to encrypt..."
          style={{
            width: '100%',
            minHeight: 100,
            padding: 12,
            fontSize: 16,
            border: '1px solid #ccc',
            borderRadius: 4,
            fontFamily: 'inherit',
            marginBottom: 16
          }}
        />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={testEncryption}
            disabled={loading || !walletConnected || !publicKey}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              backgroundColor: loading || !walletConnected || !publicKey ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: loading || !walletConnected || !publicKey ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            🔐 Encrypt Only
          </button>

          <button
            onClick={testDecryption}
            disabled={loading || !walletConnected || !encryptedData}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              backgroundColor: loading || !walletConnected || !encryptedData ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: loading || !walletConnected || !encryptedData ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            🔓 Decrypt Only
          </button>

          <button
            onClick={testRoundTrip}
            disabled={loading || !walletConnected || !publicKey}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              backgroundColor: loading || !walletConnected || !publicKey ? '#ccc' : '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: loading || !walletConnected || !publicKey ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            🔄 Full Round-Trip Test
          </button>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: 4
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {encryptedData && (
        <div style={{ marginBottom: 32, padding: 20, border: '1px solid #007bff', borderRadius: 8, backgroundColor: '#f8f9ff' }}>
          <h3 style={{ margin: '0 0 12px', color: '#007bff' }}>🔐 Encrypted Data</h3>
          <div style={{
            backgroundColor: '#fff',
            padding: 12,
            borderRadius: 4,
            border: '1px solid #ccc',
            fontFamily: 'monospace',
            fontSize: 12,
            wordBreak: 'break-all',
            maxHeight: 200,
            overflow: 'auto'
          }}>
            {encryptedData}
          </div>
        </div>
      )}

      {decryptedData && (
        <div style={{ marginBottom: 32, padding: 20, border: '1px solid #28a745', borderRadius: 8, backgroundColor: '#f8fff8' }}>
          <h3 style={{ margin: '0 0 12px', color: '#28a745' }}>🔓 Decrypted Data</h3>
          <div style={{
            backgroundColor: '#fff',
            padding: 12,
            borderRadius: 4,
            border: '1px solid #ccc',
            fontFamily: 'monospace',
            fontSize: 14,
            whiteSpace: 'pre-wrap'
          }}>
            {decryptedData}
          </div>
          
          {decryptedData === testInput && (
            <p style={{ margin: '12px 0 0', color: '#28a745', fontWeight: 500 }}>
              ✅ Decrypted data matches original input!
            </p>
          )}
          
          {decryptedData !== testInput && (
            <p style={{ margin: '12px 0 0', color: '#dc3545', fontWeight: 500 }}>
              ❌ Decrypted data does not match original input!
            </p>
          )}
        </div>
      )}

      {/* Debug Info */}
      <div style={{ marginTop: 32, padding: 20, border: '1px solid #6c757d', borderRadius: 8, backgroundColor: '#f8f9fa' }}>
        <h3 style={{ margin: '0 0 12px', color: '#6c757d' }}>🔍 Debug Information</h3>
        <p style={{ margin: '0 0 8px', fontSize: 14 }}>
          Open browser console (F12) to see detailed logs during encryption/decryption.
        </p>
        <p style={{ margin: '0', fontSize: 14 }}>
          Each step will log detailed information to help diagnose any issues.
        </p>
      </div>
    </main>
  );
}