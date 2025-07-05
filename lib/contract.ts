import { ethers } from 'ethers';

// 合约 ABI - 根据 DocumentListNFT.sol 生成
const DOCUMENT_LIST_NFT_ABI = [
  // 核心功能
  "function createDocumentList(string memory _ipfsHash, string memory _encryptedAESKey) external returns (uint256)",
  "function updateDocumentList(uint256 _tokenId, string memory _newIpfsHash, string memory _newEncryptedAESKey) external",
  "function getDocumentListByTokenId(uint256 _tokenId) external view returns (tuple(string ipfsHash, string encryptedAESKey, uint256 createdAt, uint256 lastUpdated))",
  "function getUserTokenIds(address _user) external view returns (uint256[] memory)",
  "function getCurrentTokenId() external view returns (uint256)",
  
  // 标准 ERC1155 功能
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external",
  
  // 事件
  "event DocumentListCreated(address indexed user, uint256 indexed tokenId, string ipfsHash)",
  "event DocumentListUpdated(address indexed user, uint256 indexed tokenId, string oldIpfsHash, string newIpfsHash)"
];

// 文档列表结构
export interface DocumentList {
  ipfsHash: string;
  encryptedMemo: string;
  createdAt: bigint;
  lastUpdated: bigint;
}

// 合约交易结果
export interface ContractTransactionResult {
  tokenId: bigint;
  txHash: string;
  gasUsed: bigint;
  blockNumber: number;
}

// 合约配置
export interface ContractConfig {
  address: string;
  chainId?: number;
}

/**
 * DocumentListNFT 合约交互类
 */
export class DocumentListNFTContract {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string;

  constructor(contractAddress: string) {
    this.contractAddress = contractAddress;
  }

  /**
   * 初始化合约连接
   */
  async init(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('请安装 MetaMask');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(this.contractAddress, DOCUMENT_LIST_NFT_ABI, signer);
  }

  /**
   * 创建文档列表 NFT
   */
  async createDocumentList(ipfsHash: string, encryptedMemo: string): Promise<bigint> {
    if (!this.contract) throw new Error('合约未初始化');
    
    console.log('创建文档列表 NFT...', { ipfsHash });
    
    const tx = await this.contract.createDocumentList(ipfsHash, encryptedMemo);
    const receipt = await tx.wait();
    
    // 从事件中获取 tokenId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract!.interface.parseLog(log);
        return parsed?.name === 'DocumentListCreated';
      } catch {
        return false;
      }
    });
    
    if (!event) throw new Error('创建事件未找到');
    
    const parsed = this.contract.interface.parseLog(event);
    const tokenId = parsed!.args[1];
    
    console.log('文档列表 NFT 创建成功', { tokenId: tokenId.toString() });
    return tokenId;
  }

  /**
   * 创建文档列表 NFT (包含详细交易信息)
   */
  async createDocumentListWithDetails(ipfsHash: string, encryptedMemo: string): Promise<ContractTransactionResult> {
    if (!this.contract) throw new Error('合约未初始化');
    
    console.log('=== 创建 DocumentList 参数 ===');
    console.log('ipfsHash:', ipfsHash);
    console.log('encryptedMemo:', encryptedMemo);
    
    const tx = await this.contract.createDocumentList(ipfsHash, encryptedMemo);
    console.log('=== 创建交易已提交 ===');
    console.log('Transaction Hash:', tx.hash);
    
    const receipt = await tx.wait();
    
    // 从事件中获取 tokenId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract!.interface.parseLog(log);
        return parsed?.name === 'DocumentListCreated';
      } catch {
        return false;
      }
    });
    
    if (!event) throw new Error('创建事件未找到');
    
    const parsed = this.contract.interface.parseLog(event);
    const tokenId = parsed!.args[1];
    
    const result: ContractTransactionResult = {
      tokenId,
      txHash: tx.hash,
      gasUsed: receipt.gasUsed,
      blockNumber: receipt.blockNumber
    };
    
    console.log('=== 创建新的 DocumentList 成功 ===');
    console.log('TokenId:', tokenId.toString());
    console.log('Transaction Hash:', tx.hash);
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('Block Number:', receipt.blockNumber);
    
    return result;
  }

  /**
   * 更新文档列表
   */
  async updateDocumentList(tokenId: bigint, newIpfsHash: string, newEncryptedMemo: string): Promise<void> {
    if (!this.contract) throw new Error('合约未初始化');
    
    console.log('更新文档列表...', { tokenId: tokenId.toString(), newIpfsHash });
    
    const tx = await this.contract.updateDocumentList(tokenId, newIpfsHash, newEncryptedMemo);
    await tx.wait();
    
    console.log('文档列表更新成功');
  }

  /**
   * 更新文档列表 (包含详细交易信息)
   */
  async updateDocumentListWithDetails(tokenId: bigint, newIpfsHash: string, newEncryptedMemo: string): Promise<{ txHash: string; gasUsed: bigint; blockNumber: number }> {
    if (!this.contract) throw new Error('合约未初始化');
    
    console.log('=== 更新 DocumentList 参数 ===');
    console.log('tokenId:', tokenId.toString());
    console.log('newIpfsHash:', newIpfsHash);
    console.log('newEncryptedMemo:', newEncryptedMemo);
    
    const tx = await this.contract.updateDocumentList(tokenId, newIpfsHash, newEncryptedMemo);
    console.log('=== 更新交易已提交 ===');
    console.log('Transaction Hash:', tx.hash);
    
    const receipt = await tx.wait();
    
    const result = {
      txHash: tx.hash,
      gasUsed: receipt.gasUsed,
      blockNumber: receipt.blockNumber
    };
    
    console.log('=== 更新 DocumentList 成功 ===');
    console.log('TokenId:', tokenId.toString());
    console.log('Transaction Hash:', tx.hash);
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('Block Number:', receipt.blockNumber);
    
    return result;
  }

  /**
   * 获取文档列表详情
   */
  async getDocumentList(tokenId: bigint): Promise<DocumentList> {
    if (!this.contract) throw new Error('合约未初始化');
    
    const result = await this.contract.getDocumentListByTokenId(tokenId);
    
    return {
      ipfsHash: result[0],
      encryptedMemo: result[1],
      createdAt: result[2],
      lastUpdated: result[3]
    };
  }

  /**
   * 获取用户的所有文档列表
   */
  async getUserDocumentLists(userAddress: string): Promise<DocumentList[]> {
    if (!this.contract) throw new Error('合约未初始化');
    
    const tokenIds = await this.contract.getUserTokenIds(userAddress);
    const documentLists: DocumentList[] = [];
    
    for (const tokenId of tokenIds) {
      const docList = await this.getDocumentList(tokenId);
      documentLists.push(docList);
    }
    
    return documentLists;
  }

  /**
   * 获取用户的代币 ID 列表
   */
  async getUserTokenIds(userAddress: string): Promise<bigint[]> {
    if (!this.contract) throw new Error('合约未初始化');
    return await this.contract.getUserTokenIds(userAddress);
  }

  /**
   * 转移文档列表 NFT
   */
  async transferDocumentList(to: string, tokenId: bigint): Promise<void> {
    if (!this.contract) throw new Error('合约未初始化');
    
    const signer = await this.provider!.getSigner();
    const from = await signer.getAddress();
    
    const tx = await this.contract.safeTransferFrom(from, to, tokenId, 1, '0x');
    await tx.wait();
    
    console.log('文档列表 NFT 转移成功');
  }

  /**
   * 获取当前用户地址
   */
  async getCurrentUserAddress(): Promise<string> {
    if (!this.provider) throw new Error('Provider 未初始化');
    const signer = await this.provider.getSigner();
    return await signer.getAddress();
  }

  /**
   * 监听文档列表创建事件
   */
  onDocumentListCreated(callback: (user: string, tokenId: bigint, ipfsHash: string) => void): void {
    if (!this.contract) throw new Error('合约未初始化');
    
    this.contract.on('DocumentListCreated', (user, tokenId, ipfsHash) => {
      callback(user, tokenId, ipfsHash);
    });
  }

  /**
   * 监听文档列表更新事件
   */
  onDocumentListUpdated(callback: (user: string, tokenId: bigint, oldHash: string, newHash: string) => void): void {
    if (!this.contract) throw new Error('合约未初始化');
    
    this.contract.on('DocumentListUpdated', (user, tokenId, oldHash, newHash) => {
      callback(user, tokenId, oldHash, newHash);
    });
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

/**
 * 创建合约实例的便捷函数
 */
export function createDocumentListContract(contractAddress: string): DocumentListNFTContract {
  return new DocumentListNFTContract(contractAddress);
}

/**
 * 默认合约配置
 */
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS || '0x0000000000000000000000000000000000000000';

/**
 * 获取默认合约实例
 */
export function getDefaultContract(): DocumentListNFTContract {
  return createDocumentListContract(CONTRACT_ADDRESS);
} 