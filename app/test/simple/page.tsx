'use client';

import { useState } from 'react';

export default function SimplePage() {
  const [text, setText] = useState('Hello World');
  const [encrypted, setEncrypted] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [account, setAccount] = useState('');

  const connect = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      console.log('Connected account:', accounts[0]);
      return accounts[0];
    } catch (err) {
      alert('Connection failed: ' + (err as Error).message);
    }
  };

  const encrypt = async () => {
    try {
      const addr = account || await connect();
      if (!addr) return;
      
      // 获取公钥
      const publicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: [addr]
      });
      
      console.log('Public key:', publicKey);
      
      // 使用eth-sig-util加密
      const { encrypt } = await import('@metamask/eth-sig-util');
      const result = encrypt({ publicKey, data: text, version: 'x25519-xsalsa20-poly1305' });
      
      console.log('Encryption result:', result);
      
      // 转换为hex格式（像你的示例）
      const hexData = '0x' + Buffer.from(JSON.stringify(result)).toString('hex');
      setEncrypted(hexData);
      console.log('Hex encrypted data:', hexData);
    } catch (err) {
      alert('Encryption failed: ' + (err as Error).message);
    }
  };

  const decrypt = async () => {
    try {
      const addr = account || await connect();
      if (!addr) return;
      
      // 输出调用参数
      console.log('=== eth_decrypt parameters ===');
      console.log('Encrypted data:', encrypted);
      console.log('Account address:', addr);
      console.log('Parameters array:', [encrypted, addr]);
      
      // 直接使用hex格式的加密数据
      const result = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encrypted, addr]
      });
      
      console.log('Decryption result:', result);
      setDecrypted(result);
    } catch (err) {
      console.error('Decryption error:', err);
      alert('Decryption failed: ' + (err as Error).message);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1>Simple MetaMask Encrypt/Decrypt</h1>
      
      <div style={{ marginBottom: 20 }}>
        {!account ? (
          <button onClick={connect} style={{ padding: '10px 20px', marginBottom: 10, backgroundColor: '#f6851b', color: 'white', border: 'none', borderRadius: 4 }}>
            🦊 Connect MetaMask
          </button>
        ) : (
          <div style={{ marginBottom: 10, padding: 10, backgroundColor: '#e8f5e8', borderRadius: 4 }}>
            ✅ Connected: {account}
          </div>
        )}
        
        <input 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
          placeholder="Enter text to encrypt"
          disabled={!account}
        />
        
        <button onClick={encrypt} disabled={!account} style={{ padding: '10px 20px', marginRight: 10 }}>
          🔐 Encrypt
        </button>
        <button onClick={decrypt} disabled={!encrypted || !account} style={{ padding: '10px 20px' }}>
          🔓 Decrypt
        </button>
      </div>

      {encrypted && (
        <div style={{ marginBottom: 20, padding: 10, backgroundColor: '#f0f0f0' }}>
          <strong>Encrypted (hex):</strong> {encrypted.substring(0, 100)}...
        </div>
      )}

      {decrypted && (
        <div style={{ padding: 10, backgroundColor: '#e8f5e8' }}>
          <strong>Decrypted:</strong> {decrypted}
        </div>
      )}
      
      <div style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
        Open browser console (F12) to see detailed logs
      </div>
    </div>
  );
} 