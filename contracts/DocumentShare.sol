// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DocumentShareNFT
 * @dev ERC1155合约，创建公开的文档分享NFT
 * 所有分享都是公开的，任何人都可以访问，NFT发给分享者
 */
contract DocumentShareNFT is ERC1155, Ownable {
    using Strings for uint256;
    
    // 分享状态枚举
    enum ShareStatus {
        Active,     // 激活状态
        Revoked     // 已撤销
    }

    // 分享记录结构体
    struct ShareRecord {
        uint256 shareId;            // 分享ID（同时也是token ID）
        string documentHash;        // 文档哈希（IPFS或其他）
        address sharer;             // 分享者地址
        string encryptedKey;        // 访问密钥
        string shareMessage;        // 分享消息
        uint256 createdAt;          // 创建时间
        ShareStatus status;         // 分享状态
    }

    // token ID到分享记录的映射
    mapping(uint256 => ShareRecord) public shareRecords;
    
    // 用户创建的分享列表
    mapping(address => uint256[]) public userCreatedShares;
    
    // 文档哈希到分享ID列表的映射
    mapping(string => uint256[]) public documentShares;
    
    // 当前分享ID计数器
    uint256 private _currentShareId = 1;

    // 分享创建事件
    event ShareCreated(
        uint256 indexed shareId,
        string indexed documentHash,
        address indexed sharer
    );
    
    // 分享撤销事件
    event ShareRevoked(
        uint256 indexed shareId,
        address indexed sharer
    );

    /**
     * @dev 构造函数
     * @param _uri 基础URI，用于ERC1155元数据
     */
    constructor(string memory _uri) ERC1155(_uri) Ownable(msg.sender) {}

    /**
     * @dev 创建公开文档分享并铸造NFT给分享者
     * @param _documentHash 文档哈希
     * @param _encryptedKey 访问密钥
     * @param _shareMessage 分享消息
     */
    function createShare(
        string memory _documentHash,
        string memory _encryptedKey,
        string memory _shareMessage
    ) external returns (uint256) {
        require(bytes(_documentHash).length > 0, "Document hash cannot be empty");
        require(bytes(_encryptedKey).length > 0, "Encrypted key cannot be empty");
        
        // 获取当前分享ID（也是token ID）
        uint256 shareId = _currentShareId;
        
        // 创建分享记录
        shareRecords[shareId] = ShareRecord({
            shareId: shareId,
            documentHash: _documentHash,
            sharer: msg.sender,
            encryptedKey: _encryptedKey,
            shareMessage: _shareMessage,
            createdAt: block.timestamp,
            status: ShareStatus.Active
        });
        
        // 铸造NFT给分享者
        _mint(msg.sender, shareId, 1, "");
        
        // 更新映射关系
        userCreatedShares[msg.sender].push(shareId);
        documentShares[_documentHash].push(shareId);
        
        // 触发分享创建事件
        emit ShareCreated(shareId, _documentHash, msg.sender);
        
        // 递增分享ID计数器
        _currentShareId++;
        
        return shareId;
    }

    /**
     * @dev 撤销分享
     * @param _shareId 分享ID
     */
    function revokeShare(uint256 _shareId) external {
        ShareRecord storage record = shareRecords[_shareId];
        require(record.sharer == msg.sender, "Not authorized to revoke this share");
        require(record.status == ShareStatus.Active, "Share is not active");
        
        // 更新分享状态
        record.status = ShareStatus.Revoked;
        
        // 触发分享撤销事件
        emit ShareRevoked(_shareId, msg.sender);
    }

    /**
     * @dev 检查分享是否有效
     * @param _shareId 分享ID
     * @return 是否有效
     */
    function isShareValid(uint256 _shareId) public view returns (bool) {
        ShareRecord memory record = shareRecords[_shareId];
        return record.shareId != 0 && record.status == ShareStatus.Active;
    }

    /**
     * @dev 获取分享记录
     * @param _shareId 分享ID
     * @return 分享记录结构体
     */
    function getShareRecord(uint256 _shareId) external view returns (ShareRecord memory) {
        require(shareRecords[_shareId].shareId != 0, "Share does not exist");
        return shareRecords[_shareId];
    }

    /**
     * @dev 获取用户创建的所有分享
     * @param _user 用户地址
     * @return 分享ID数组
     */
    function getUserCreatedShares(address _user) external view returns (uint256[] memory) {
        return userCreatedShares[_user];
    }

    /**
     * @dev 获取文档的有效分享数量
     * @param _documentHash 文档哈希
     * @return 有效分享数量
     */
    function getDocumentValidShareCount(string memory _documentHash) external view returns (uint256) {
        uint256[] memory shareIds = documentShares[_documentHash];
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < shareIds.length; i++) {
            if (isShareValid(shareIds[i])) {
                validCount++;
            }
        }
        
        return validCount;
    }

    /**
     * @dev 获取当前分享ID计数器
     * @return 当前分享ID计数器值
     */
    function getCurrentShareId() external view returns (uint256) {
        return _currentShareId;
    }

    /**
     * @dev 检查分享是否存在
     * @param _shareId 分享ID
     * @return 是否存在
     */
    function shareExists(uint256 _shareId) external view returns (bool) {
        return shareRecords[_shareId].shareId != 0;
    }

    /**
     * @dev 重写URI函数，返回特定代币的URI
     * @param _tokenId 代币ID
     * @return 代币的元数据URI
     */
    function uri(uint256 _tokenId) public view virtual override returns (string memory) {
        require(shareRecords[_tokenId].shareId != 0, "URI query for nonexistent token");
        return string(abi.encodePacked(super.uri(_tokenId), _tokenId.toString()));
    }

    /**
     * @dev 更新合约的基础URI（仅所有者可调用）
     * @param _newURI 新的基础URI
     */
    function setURI(string memory _newURI) external onlyOwner {
        _setURI(_newURI);
    }
} 