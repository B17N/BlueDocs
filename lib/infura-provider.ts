/**
 * Infura provider for read-only blockchain access
 * Used for viewing shared documents without wallet connection
 */

import { ethers } from 'ethers';
import { getDocumentNFTContract, getContractAddress, DOCUMENT_NFT_ABI } from './contract';

/**
 * Get Infura provider
 */
export const getInfuraProvider = (): ethers.JsonRpcProvider => {
  const infuraApiKey = process.env.NEXT_PUBLIC_INFURA_API_KEY || 'your_api_key_here';
  const network = process.env.NEXT_PUBLIC_INFURA_NETWORK || 'sepolia';
  
  return new ethers.JsonRpcProvider(
    `https://${network}.infura.io/v3/${infuraApiKey}`
  );
};

/**
 * Get read-only contract instance with Infura provider
 */
export const getReadOnlyContract = () => {
  const provider = getInfuraProvider();
  const contractAddress = getContractAddress();
  
  return new ethers.Contract(contractAddress, DOCUMENT_NFT_ABI, provider);
};

/**
 * Get document info from NFT using Infura (no wallet needed)
 */
export const getDocumentInfoReadOnly = async (tokenId: number) => {
  try {
    const contract = getReadOnlyContract();
    const docInfo = await contract.getDocumentInfo(tokenId);
    
    return {
      documentId: docInfo.documentId,
      docUID: docInfo.docUID,
      rootDocumentId: docInfo.rootDocumentId,
      storageAddress: docInfo.storageAddress,
      docMemo: docInfo.docMemo,
      createdAt: new Date(Number(docInfo.createdAt) * 1000),
      creator: docInfo.creator
    };
  } catch (error) {
    console.error('Error getting document info:', error);
    throw new Error(`Failed to get document info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 