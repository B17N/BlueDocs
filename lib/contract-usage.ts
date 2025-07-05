import { DocumentListNFTContract, getDefaultContract, DocumentList } from './contract';

/**
 * 文档列表管理服务
 */
export class DocumentListService {
  private contract: DocumentListNFTContract;
  private initialized = false;

  constructor(contractAddress?: string) {
    this.contract = contractAddress 
      ? new DocumentListNFTContract(contractAddress)
      : getDefaultContract();
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    
    await this.contract.init();
    this.initialized = true;
    console.log('📄 文档列表服务初始化成功');
  }

  /**
   * 创建文档列表
   */
  async createDocumentList(ipfsHash: string, encryptedKey: string): Promise<bigint> {
    await this.init();
    
    const tokenId = await this.contract.createDocumentList(ipfsHash, encryptedKey);
    console.log('✅ 文档列表创建成功', { tokenId: tokenId.toString() });
    
    return tokenId;
  }

  /**
   * 更新文档列表
   */
  async updateDocumentList(tokenId: bigint, newIpfsHash: string, newEncryptedKey: string): Promise<void> {
    await this.init();
    
    await this.contract.updateDocumentList(tokenId, newIpfsHash, newEncryptedKey);
    console.log('✅ 文档列表更新成功', { tokenId: tokenId.toString() });
  }

  /**
   * 获取文档列表详情
   */
  async getDocumentList(tokenId: bigint): Promise<DocumentList> {
    await this.init();
    
    return await this.contract.getDocumentList(tokenId);
  }

  /**
   * 获取我的所有文档列表
   */
  async getMyDocumentLists(): Promise<DocumentList[]> {
    await this.init();
    
    const userAddress = await this.contract.getCurrentUserAddress();
    return await this.contract.getUserDocumentLists(userAddress);
  }

  /**
   * 获取我的代币 ID 列表
   */
  async getMyTokenIds(): Promise<bigint[]> {
    await this.init();
    
    const userAddress = await this.contract.getCurrentUserAddress();
    return await this.contract.getUserTokenIds(userAddress);
  }

  /**
   * 转移文档列表
   */
  async transferDocumentList(to: string, tokenId: bigint): Promise<void> {
    await this.init();
    
    await this.contract.transferDocumentList(to, tokenId);
    console.log('✅ 文档列表转移成功', { to, tokenId: tokenId.toString() });
  }

  /**
   * 监听事件
   */
  setupListeners(): void {
    this.contract.onDocumentListCreated((user, tokenId, ipfsHash) => {
      console.log('🔔 文档列表创建事件', { user, tokenId: tokenId.toString(), ipfsHash });
    });

    this.contract.onDocumentListUpdated((user, tokenId, oldHash, newHash) => {
      console.log('🔔 文档列表更新事件', { 
        user, 
        tokenId: tokenId.toString(), 
        oldHash: oldHash.substring(0, 10) + '...', 
        newHash: newHash.substring(0, 10) + '...' 
      });
    });
  }

  /**
   * 清理
   */
  cleanup(): void {
    this.contract.removeAllListeners();
    console.log('🧹 事件监听器已清理');
  }
}

/**
 * 使用示例
 */
export async function exampleUsage(): Promise<void> {
  const service = new DocumentListService();
  
  try {
    // 1. 初始化
    await service.init();
    
    // 2. 设置事件监听
    service.setupListeners();
    
    // 3. 创建文档列表
    const tokenId = await service.createDocumentList(
      'QmExampleHash123...',
      'encrypted_aes_key_here...'
    );
    
    // 4. 获取我的文档列表
    const myDocumentLists = await service.getMyDocumentLists();
    console.log('我的文档列表:', myDocumentLists);
    
    // 5. 更新文档列表
    await service.updateDocumentList(
      tokenId,
      'QmNewHash456...',
      'new_encrypted_key...'
    );
    
    // 6. 清理
    service.cleanup();
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  }
}

/**
 * 快速创建文档列表
 */
export async function quickCreateDocumentList(ipfsHash: string, encryptedKey: string): Promise<bigint> {
  const service = new DocumentListService();
  return await service.createDocumentList(ipfsHash, encryptedKey);
}

/**
 * 快速获取我的文档列表
 */
export async function quickGetMyDocumentLists(): Promise<DocumentList[]> {
  const service = new DocumentListService();
  return await service.getMyDocumentLists();
}

/**
 * 快速更新文档列表
 */
export async function quickUpdateDocumentList(
  tokenId: bigint, 
  newIpfsHash: string, 
  newEncryptedKey: string
): Promise<void> {
  const service = new DocumentListService();
  await service.updateDocumentList(tokenId, newIpfsHash, newEncryptedKey);
}

// 导出默认服务实例
export const documentListService = new DocumentListService(); 