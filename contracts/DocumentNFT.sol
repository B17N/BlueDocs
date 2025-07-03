// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title UserDocumentNFT
 * @dev ERC1155合约，每个用户地址对应一个唯一的NFT
 * 每个NFT代表用户的所有文档，存储在IPFS上
 * 这样可以大大降低链上成本，同时保持去中心化存储
 */
contract UserDocumentNFT is ERC1155, Ownable {
    using Strings for uint256;

    // 用户文档信息结构体
    struct UserDocuments {
        string ipfsHash;         // IPFS哈希，指向包含用户所有文档列表的JSON文件
        string encryptedAESKey;  // 加密的AES密钥，用于解密文档内容
        uint256 createdAt;       // 创建时间戳
        uint256 lastUpdated;     // 最后更新时间戳
    }

    // 代币ID到文档信息的映射
    mapping(uint256 => UserDocuments) public userDocuments;
    
    // 用户地址到拥有的代币ID列表的映射
    mapping(address => uint256[]) public userTokenIds;
    
    // 代币ID到用户地址的映射
    mapping(uint256 => address) public tokenIdToUser;
    
    // 当前可用的代币ID计数器
    uint256 private _currentTokenId = 1;
    
    // 用户文档创建事件
    event UserDocumentsCreated(
        address indexed user,
        uint256 indexed tokenId,
        string ipfsHash
    );
    
    // 用户文档更新事件
    event UserDocumentsUpdated(
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
     * @dev 为用户创建文档NFT（
     * @param _ipfsHash 初始IPFS哈希（包含文档列表的JSON文件）
     * @param _encryptedAESKey 加密的AES密钥
     */
    function createUserDocuments(
        string memory _ipfsHash,
        string memory _encryptedAESKey
    ) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_encryptedAESKey).length > 0, "Encrypted AES key cannot be empty");
        
        // 获取当前token ID
        uint256 tokenId = _currentTokenId;
        
        // 创建用户文档信息
        userDocuments[tokenId] = UserDocuments({
            ipfsHash: _ipfsHash,
            encryptedAESKey: _encryptedAESKey,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });
        
        // 建立用户和代币ID的映射
        userTokenIds[msg.sender].push(tokenId);
        tokenIdToUser[tokenId] = msg.sender;
        
        // 铸造NFT到用户地址（数量为1）
        _mint(msg.sender, tokenId, 1, "");
        
        // 触发创建事件
        emit UserDocumentsCreated(msg.sender, tokenId, _ipfsHash);
        
        // 递增token ID计数器
        _currentTokenId++;
        
        return tokenId;
    }

    /**
     * @dev 更新用户的文档和AES密钥（文档更新时总是使用新的AES密钥）
     * @param _tokenId 要更新的代币ID
     * @param _newIpfsHash 新的IPFS哈希
     * @param _newEncryptedAESKey 新的加密AES密钥
     */
    function updateDocuments(
        uint256 _tokenId, 
        string memory _newIpfsHash, 
        string memory _newEncryptedAESKey
    ) external {
        // 验证NFT是否存在且调用者是所有者
        require(tokenIdToUser[_tokenId] == msg.sender, "Not authorized or NFT does not exist");
        require(bytes(_newIpfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_newEncryptedAESKey).length > 0, "Encrypted AES key cannot be empty");
        
        // 保存旧IPFS哈希用于事件记录
        string memory oldIpfsHash = userDocuments[_tokenId].ipfsHash;
        
        // 更新文档信息和AES密钥
        userDocuments[_tokenId].ipfsHash = _newIpfsHash;
        userDocuments[_tokenId].encryptedAESKey = _newEncryptedAESKey;
        userDocuments[_tokenId].lastUpdated = block.timestamp;
        
        // 触发更新事件
        emit UserDocumentsUpdated(msg.sender, _tokenId, oldIpfsHash, _newIpfsHash);
    }

    /**
     * @dev 通过代币ID获取文档信息
     * @param _tokenId 代币ID
     * @return 文档信息结构体
     */
    function getDocumentsByTokenId(uint256 _tokenId) external view returns (UserDocuments memory) {
        require(tokenIdToUser[_tokenId] != address(0), "Token does not exist");
        return userDocuments[_tokenId];
    }

    /**
     * @dev 获取用户拥有的所有代币ID
     * @param _user 用户地址
     * @return 用户的代币ID数组
     */
    function getUserTokenIds(address _user) external view returns (uint256[] memory) {
        return userTokenIds[_user];
    }

    /**
     * @dev 检查用户是否有文档NFT
     * @param _user 用户地址
     * @return 是否至少拥有一个NFT
     */
    function hasUserDocuments(address _user) external view returns (bool) {
        return userTokenIds[_user].length > 0;
    }

    /**
     * @dev 获取当前最大的代币ID
     * @return 当前代币ID计数器值
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _currentTokenId;
    }

    /**
     * @dev 重写URI函数，返回特定代币的URI
     * @param _tokenId 代币ID
     * @return 代币的元数据URI
     */
    function uri(uint256 _tokenId) public view virtual override returns (string memory) {
        require(tokenIdToUser[_tokenId] != address(0), "URI query for nonexistent token");
        return string(abi.encodePacked(super.uri(_tokenId), _tokenId.toString()));
    }

    /**
     * @dev 更新合约的基础URI（仅所有者可调用）
     * @param _newURI 新的基础URI
     */
    function setURI(string memory _newURI) external onlyOwner {
        _setURI(_newURI);
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
     * @dev 从用户的token列表中移除指定token
     * @param _user 用户地址
     * @param _tokenId 要移除的代币ID
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