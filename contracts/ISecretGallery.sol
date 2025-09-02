// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint256, eaddress, externalEuint256, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";

/// @title ISecretGallery - Interface for SecretGallery contract
/// @notice Interface defining the core functionality of the SecretGallery
interface ISecretGallery {
    
    // Events
    event FileUploaded(uint256 indexed fileId, address indexed owner, uint256 timestamp);
    event FileGranted(uint256 indexed fileId, address indexed owner, address indexed grantee);
    event FileGrantRevoked(uint256 indexed fileId, address indexed owner, address indexed grantee);

    /// @notice Upload an encrypted file to the gallery
    /// @param encryptedIpfsHash The encrypted IPFS hash (as number)
    /// @param encryptedPassword The encrypted AES password (as address)
    /// @param inputProof The input proof for validation
    /// @return fileId The ID of the uploaded file
    function uploadFile(
        externalEuint256 encryptedIpfsHash,
        externalEaddress encryptedPassword,
        bytes calldata inputProof
    ) external returns (uint256 fileId);

    /// @notice Grant access to a file for another address
    /// @param fileId The file ID to grant access to
    /// @param grantee The address to grant access to
    function grantFileAccess(uint256 fileId, address grantee) external;

    /// @notice Revoke access to a file from an address
    /// @param fileId The file ID to revoke access from
    /// @param grantee The address to revoke access from
    function revokeFileAccess(uint256 fileId, address grantee) external;

    /// @notice Get encrypted file data (IPFS hash and AES password)
    /// @param fileId The file ID
    /// @return ipfsHash The encrypted IPFS hash number
    /// @return aesPassword The encrypted AES password
    function getFileData(uint256 fileId) external view returns (euint256 ipfsHash, eaddress aesPassword);

    /// @notice Get file metadata
    /// @param fileId The file ID
    /// @return owner The file owner
    /// @return timestamp The upload timestamp
    function getFileMetadata(uint256 fileId) external view returns (address owner, uint256 timestamp);

    /// @notice Get all file IDs owned by an address
    /// @param owner The owner address
    /// @return fileIds Array of file IDs owned by the address
    function getOwnerFiles(address owner) external view returns (uint256[] memory);

    /// @notice Check if an address has access to a file
    /// @param fileId The file ID
    /// @param accessor The address to check
    /// @return hasAccess True if the address has access, false otherwise
    function hasFileAccess(uint256 fileId, address accessor) external view returns (bool);

    /// @notice Get all addresses that have been granted access to a file
    /// @param fileId The file ID
    /// @return grantees Array of addresses with access to the file
    function getFileGrantees(uint256 fileId) external view returns (address[] memory);

    /// @notice Get the current file ID counter
    /// @return The current file ID counter
    function getCurrentFileId() external view returns (uint256);

    /// @notice Check if a file exists
    /// @param fileId The file ID to check
    /// @return exists True if the file exists, false otherwise
    function fileExists(uint256 fileId) external view returns (bool);
}