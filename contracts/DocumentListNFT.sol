// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DocumentListNFT
 * @dev ERC1155合约，用于管理用户的文档列表NFT
 * 每个NFT代表用户的一个文档列表，存储在IPFS上
 * 这样可以大大降低链上成本，同时保持去中心化存储
 */
contract DocumentListNFT is ERC1155, Ownable {
    using Strings for uint256;

    // 用户文档列表信息结构体
    struct DocumentList {
        string ipfsHash;         // IPFS哈希，指向包含用户所有文档列表的JSON文件
        string encryptedAESKey;  // 加密的AES密钥，用于解密文档内容
        uint256 createdAt;       // 创建时间戳
        uint256 lastUpdated;     // 最后更新时间戳
    }

    // 文档列表ID到文档列表信息的映射
    mapping(uint256 => DocumentList) public DocumentLists;
    
    // 用户地址到拥有的文档列表ID列表的映射
    mapping(address => uint256[]) public userTokenIds;
    
    // 文档列表ID到用户地址的映射
    mapping(uint256 => address) public tokenIdToUser;
    
    // 当前可用的文档列表ID计数器
    uint256 private _currentTokenId = 1;
    
    // 用户文档列表创建事件
    event DocumentListCreated(
        address indexed user,
        uint256 indexed tokenId,
        string ipfsHash
    );
    
    // 用户文档列表更新事件
    event DocumentListUpdated(
        address indexed user,
        uint256 indexed tokenId,
        string oldIpfsHash,
        string newIpfsHash
    );

    /**
     * @dev 构造函数
     * @param _uri 基础URI，用于ERC1155元数据
     */
    constructor(string memory _uri) ERC1155(_uri) Ownable(msg.sender) {}

    /**
     * @dev 为用户创建文档列表NFT
     * @param _ipfsHash 初始IPFS哈希（包含文档列表的JSON文件
     * @param _encryptedAESKey 加密的AES密钥
     */
    function createDocumentList(
        string memory _ipfsHash,
        string memory _encryptedAESKey
    ) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_encryptedAESKey).length > 0, "Encrypted AES key cannot be empty");
        
        // 获取当前文档列表ID
        uint256 tokenId = _currentTokenId;
        
        // 创建用户文档列表信息
        DocumentLists[tokenId] = DocumentList({
            ipfsHash: _ipfsHash,
            encryptedAESKey: _encryptedAESKey,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });
        
        // 建立用户和文档列表ID的映射
        userTokenIds[msg.sender].push(tokenId);
        tokenIdToUser[tokenId] = msg.sender;
        
        // 铸造NFT到用户地址（数量为1）
        _mint(msg.sender, tokenId, 1, "");
        
        // 触发创建事件
        emit DocumentListCreated(msg.sender, tokenId, _ipfsHash);
        
        // 递增token ID计数器
        _currentTokenId++;
        
        return tokenId;
    }

    /**
     * @dev 更新用户的文档列表和AES密钥（文档更新时总是使用新的AES密钥）
     * @param _tokenId 要更新的文档列表ID
     * @param _newIpfsHash 新的IPFS哈希
     * @param _newEncryptedAESKey 新的加密AES密钥
     */
    function updateDocumentList(
        uint256 _tokenId, 
        string memory _newIpfsHash, 
        string memory _newEncryptedAESKey
    ) external {
        // 验证NFT是否存在且调用者是所有者
        require(tokenIdToUser[_tokenId] == msg.sender, "Not authorized or NFT does not exist");
        require(bytes(_newIpfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_newEncryptedAESKey).length > 0, "Encrypted AES key cannot be empty");
        
        // 保存旧IPFS哈希用于事件记录
        string memory oldIpfsHash = DocumentLists[_tokenId].ipfsHash;
        
        // 更新文档信息和AES密钥
        DocumentLists[_tokenId].ipfsHash = _newIpfsHash;
        DocumentLists[_tokenId].encryptedAESKey = _newEncryptedAESKey;
        DocumentLists[_tokenId].lastUpdated = block.timestamp;
        
        // 触发更新事件
        emit DocumentListUpdated(msg.sender, _tokenId, oldIpfsHash, _newIpfsHash);
    }

    /**
     * @dev 通过文档列表ID获取文档列表信息
     * @param _tokenId 文档列表ID
     * @return 文档信息结构体
     */
    function getDocumentListByTokenId(uint256 _tokenId) external view returns (DocumentList memory) {
        require(tokenIdToUser[_tokenId] != address(0), "Token does not exist");
        return DocumentLists[_tokenId];
    }

    /**
     * @dev 获取用户拥有的所有文档列表ID
     * @param _user 用户地址
     * @return 用户的文档列表ID数组
     */
    function getUserTokenIds(address _user) external view returns (uint256[] memory) {
        return userTokenIds[_user];
    }

    /**
     * @dev 获取当前最大的文档列表ID
     * @return 当前文档列表ID计数器值
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _currentTokenId;
    }

    /**
     * @dev 重写转移函数，更新映射关系
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        super.safeTransferFrom(from, to, id, amount, data);
        
        // 更新映射关系
        if (balanceOf(from, id) == 0) {
            // 从原用户的token列表中移除
            _removeTokenFromUser(from, id);
            
            // 添加到新用户的token列表
            userTokenIds[to].push(id);
            
            // 更新tokenId到用户的映射
            tokenIdToUser[id] = to;
        }
    }

    /**
     * @dev 从用户的文档列表中移除指定文档列表ID
     * @param _user 用户地址
     * @param _tokenId 要移除的文档列表ID
     */
    function _removeTokenFromUser(address _user, uint256 _tokenId) private {
        uint256[] storage tokens = userTokenIds[_user];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == _tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
}