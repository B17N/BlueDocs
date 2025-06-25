// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DocumentNFT
 * @dev ERC1155合约，用于管理对应IPFS文件的文档NFT
 * 每个NFT代表一个文档，包含完整的文档元数据
 */
contract DocumentNFT is ERC1155, Ownable {
    using Strings for uint256;

    // 文档结构体，包含所有必要的文档信息
    struct DocumentInfo {
        string documentId;      // 短文档ID，用于快速识别
        string docUID;         // 文档唯一ID，全局唯一标识符
        string rootDocumentId; // 如果这是历史版本，存储主文档的ID
        string storageAddress; // 存储地址（IPFS、Arweave等分布式存储）
        string docMemo;        // 文档备注，可后续更新的字段
        uint256 createdAt;     // 创建时间戳
        address creator;       // 文档创建者地址
    }

    // 代币ID到文档信息的映射
    mapping(uint256 => DocumentInfo) public documents;
    
    // 当前可用的代币ID计数器
    uint256 private _currentTokenId = 1;
    
    // 文档创建事件
    event DocumentCreated(
        uint256 indexed tokenId,
        string documentId,
        string docUID,
        address indexed creator
    );
    
    // 文档备注更新事件
    event DocumentMemoUpdated(
        uint256 indexed tokenId,
        string oldMemo,
        string newMemo,
        address indexed updater
    );

    /**
     * @dev 构造函数
     * @param _uri 基础URI，用于ERC1155元数据
     */
    constructor(string memory _uri) ERC1155(_uri) Ownable(msg.sender) {}

    /**
     * @dev 创建新的文档NFT
     * @param _to 接收NFT的地址
     * @param _amount 铸造数量
     * @param _documentId 短文档ID
     * @param _docUID 文档唯一ID
     * @param _rootDocumentId 根文档ID（如果是版本文档）
     * @param _storageAddress 存储地址
     * @param _docMemo 文档备注
     */
    function createDocument(
        address _to,
        uint256 _amount,
        string memory _documentId,
        string memory _docUID,
        string memory _rootDocumentId,
        string memory _storageAddress,
        string memory _docMemo
    ) external returns (uint256) {
        // 获取当前token ID
        uint256 tokenId = _currentTokenId;
        
        // 创建文档信息结构体
        documents[tokenId] = DocumentInfo({
            documentId: _documentId,
            docUID: _docUID,
            rootDocumentId: _rootDocumentId,
            storageAddress: _storageAddress,
            docMemo: _docMemo,
            createdAt: block.timestamp,  // 记录当前区块时间戳
            creator: msg.sender          // 记录合约调用者为创建者
        });
        
        // 铸造NFT到指定地址
        _mint(_to, tokenId, _amount, "");
        
        // 触发文档创建事件
        emit DocumentCreated(tokenId, _documentId, _docUID, msg.sender);
        
        // 递增token ID计数器，为下次创建准备
        _currentTokenId++;
        
        return tokenId;
    }

    /**
     * @dev 更新文档备注（只有NFT持有者或合约所有者可以调用）
     * @param _tokenId 要更新的代币ID
     * @param _newMemo 新的备注内容
     */
    function updateDocumentMemo(uint256 _tokenId, string memory _newMemo) external {
        // 验证代币是否存在（通过检查创建时间）
        require(documents[_tokenId].createdAt > 0, "Document does not exist");
        
        // 验证调用者权限：必须是NFT持有者或合约所有者
        require(
            balanceOf(msg.sender, _tokenId) > 0 || msg.sender == owner(),
            "Not authorized to update memo"
        );
        
        // 保存旧备注用于事件记录
        string memory oldMemo = documents[_tokenId].docMemo;
        
        // 更新文档备注
        documents[_tokenId].docMemo = _newMemo;
        
        // 触发备注更新事件
        emit DocumentMemoUpdated(_tokenId, oldMemo, _newMemo, msg.sender);
    }

    /**
     * @dev 获取文档的完整信息
     * @param _tokenId 代币ID
     * @return 文档信息结构体
     */
    function getDocumentInfo(uint256 _tokenId) external view returns (DocumentInfo memory) {
        // 验证文档是否存在
        require(documents[_tokenId].createdAt > 0, "Document does not exist");
        return documents[_tokenId];
    }

    /**
     * @dev 检查文档是否存在
     * @param _tokenId 代币ID
     * @return 是否存在
     */
    function documentExists(uint256 _tokenId) external view returns (bool) {
        return documents[_tokenId].createdAt > 0;
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
        // 验证代币是否存在
        require(documents[_tokenId].createdAt > 0, "URI query for nonexistent token");
        
        // 返回基础URI + tokenId，用于获取元数据
        return string(abi.encodePacked(super.uri(_tokenId), _tokenId.toString()));
    }

    /**
     * @dev 批量创建文档NFT（节省gas费用）
     * @param _to 接收地址
     * @param _amounts 每个NFT的数量数组
     * @param _documentIds 文档ID数组
     * @param _docUIDs 文档唯一ID数组
     * @param _rootDocumentIds 根文档ID数组
     * @param _storageAddresses 存储地址数组
     * @param _docMemos 备注数组
     */
    function batchCreateDocuments(
        address _to,
        uint256[] memory _amounts,
        string[] memory _documentIds,
        string[] memory _docUIDs,
        string[] memory _rootDocumentIds,
        string[] memory _storageAddresses,
        string[] memory _docMemos
    ) external returns (uint256[] memory) {
        // 验证所有数组长度一致
        require(_amounts.length == _documentIds.length, "Array length mismatch");
        require(_amounts.length == _docUIDs.length, "Array length mismatch");
        require(_amounts.length == _rootDocumentIds.length, "Array length mismatch");
        require(_amounts.length == _storageAddresses.length, "Array length mismatch");
        require(_amounts.length == _docMemos.length, "Array length mismatch");
        
        uint256[] memory tokenIds = new uint256[](_amounts.length);
        uint256[] memory ids = new uint256[](_amounts.length);
        
        // 批量创建文档信息
        for (uint256 i = 0; i < _amounts.length; i++) {
            uint256 tokenId = _currentTokenId;
            tokenIds[i] = tokenId;
            ids[i] = tokenId;
            
            // 创建文档信息
            documents[tokenId] = DocumentInfo({
                documentId: _documentIds[i],
                docUID: _docUIDs[i],
                rootDocumentId: _rootDocumentIds[i],
                storageAddress: _storageAddresses[i],
                docMemo: _docMemos[i],
                createdAt: block.timestamp,
                creator: msg.sender
            });
            
            // 触发创建事件
            emit DocumentCreated(tokenId, _documentIds[i], _docUIDs[i], msg.sender);
            
            _currentTokenId++;
        }
        
        // 批量铸造NFT
        _mintBatch(_to, ids, _amounts, "");
        
        return tokenIds;
    }

    /**
     * @dev 更新合约的基础URI（仅所有者可调用）
     * @param _newURI 新的基础URI
     */
    function setURI(string memory _newURI) external onlyOwner {
        _setURI(_newURI);
    }
}