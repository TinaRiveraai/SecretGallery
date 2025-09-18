// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, eaddress, externalEuint256, externalEaddress, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecretGallery - Encrypted Image/File Library
/// @notice A confidential gallery for storing encrypted IPFS hashes and AES passwords
/// @dev Uses Zama FHE to store encrypted IPFS hashes (as numbers) and AES passwords (as addresses)
contract SecretGallery is SepoliaConfig {
    struct EncryptedFile {
        euint256 ipfsHashNumber; // IPFS hash converted to number, encrypted
        eaddress aesPassword; // AES password in EVM address format, encrypted
        address owner; // File owner
        uint256 timestamp; // Upload timestamp
        bool exists; // File existence flag
    }

    // File ID counter
    uint256 private _fileIdCounter;

    // Mapping from file ID to encrypted file data
    mapping(uint256 => EncryptedFile) private _files;

    // Mapping from owner to their file IDs
    mapping(address => uint256[]) private _ownerFiles;

    // Mapping from file ID to granted addresses
    mapping(uint256 => mapping(address => bool)) private _fileGrants;

    // Mapping from file ID to list of granted addresses (for enumeration)
    mapping(uint256 => address[]) private _fileGrantees;

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
    ) external returns (uint256 fileId) {
        // Validate and convert external inputs
        euint256 ipfsHash = FHE.fromExternal(encryptedIpfsHash, inputProof);
        eaddress aesPassword = FHE.fromExternal(encryptedPassword, inputProof);

        // Increment file ID counter
        _fileIdCounter++;
        fileId = _fileIdCounter;

        // Store encrypted file data
        _files[fileId] = EncryptedFile({
            ipfsHashNumber: ipfsHash,
            aesPassword: aesPassword,
            owner: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        // Add to owner's file list
        _ownerFiles[msg.sender].push(fileId);

        // Grant permissions
        FHE.allowThis(ipfsHash);
        FHE.allow(ipfsHash, msg.sender);
        FHE.allowThis(aesPassword);
        FHE.allow(aesPassword, msg.sender);

        emit FileUploaded(fileId, msg.sender, block.timestamp);
    }

    /// @notice Grant access to a file for another address
    /// @param fileId The file ID to grant access to
    /// @param grantee The address to grant access to
    function grantFileAccess(uint256 fileId, address grantee) external {
        require(_files[fileId].exists, "File does not exist");
        require(_files[fileId].owner == msg.sender, "Not file owner");
        require(grantee != address(0), "Invalid grantee address");
        require(grantee != msg.sender, "Cannot grant to yourself");
        require(!_fileGrants[fileId][grantee], "Access already granted");

        // Grant access
        _fileGrants[fileId][grantee] = true;
        _fileGrantees[fileId].push(grantee);

        // Grant FHE permissions
        FHE.allow(_files[fileId].ipfsHashNumber, grantee);
        FHE.allow(_files[fileId].aesPassword, grantee);

        emit FileGranted(fileId, msg.sender, grantee);
    }

    /// @notice Revoke access to a file from an address
    /// @param fileId The file ID to revoke access from
    /// @param grantee The address to revoke access from
    function revokeFileAccess(uint256 fileId, address grantee) external {
        require(_files[fileId].exists, "File does not exist");
        require(_files[fileId].owner == msg.sender, "Not file owner");
        require(_fileGrants[fileId][grantee], "Access not granted");

        // Revoke access
        _fileGrants[fileId][grantee] = false;

        // Remove from grantees list
        address[] storage grantees = _fileGrantees[fileId];
        for (uint256 i = 0; i < grantees.length; i++) {
            if (grantees[i] == grantee) {
                grantees[i] = grantees[grantees.length - 1];
                grantees.pop();
                break;
            }
        }

        emit FileGrantRevoked(fileId, msg.sender, grantee);
    }

    /// @notice Get encrypted file data (IPFS hash and AES password)
    /// @param fileId The file ID
    /// @return ipfsHash The encrypted IPFS hash number
    /// @return aesPassword The encrypted AES password
    function getFileData(uint256 fileId) external view returns (euint256 ipfsHash, eaddress aesPassword) {
        require(_files[fileId].exists, "File does not exist");

        return (_files[fileId].ipfsHashNumber, _files[fileId].aesPassword);
    }

    /// @notice Get file metadata
    /// @param fileId The file ID
    /// @return owner The file owner
    /// @return timestamp The upload timestamp
    function getFileMetadata(uint256 fileId) external view returns (address owner, uint256 timestamp) {
        require(_files[fileId].exists, "File does not exist");
        return (_files[fileId].owner, _files[fileId].timestamp);
    }

    /// @notice Get all file IDs owned by an address
    /// @param owner The owner address
    /// @return fileIds Array of file IDs owned by the address
    function getOwnerFiles(address owner) external view returns (uint256[] memory) {
        return _ownerFiles[owner];
    }

    /// @notice Check if an address has access to a file
    /// @param fileId The file ID
    /// @param accessor The address to check
    /// @return hasAccess True if the address has access, false otherwise
    function hasFileAccess(uint256 fileId, address accessor) external view returns (bool) {
        if (!_files[fileId].exists) return false;
        return _files[fileId].owner == accessor || _fileGrants[fileId][accessor];
    }

    /// @notice Get all addresses that have been granted access to a file
    /// @param fileId The file ID
    /// @return grantees Array of addresses with access to the file
    function getFileGrantees(uint256 fileId) external view returns (address[] memory) {
        require(_files[fileId].exists, "File does not exist");
        require(_files[fileId].owner == msg.sender, "Not file owner");

        return _fileGrantees[fileId];
    }

    /// @notice Get the current file ID counter
    /// @return The current file ID counter
    function getCurrentFileId() external view returns (uint256) {
        return _fileIdCounter;
    }

    /// @notice Check if a file exists
    /// @param fileId The file ID to check
    /// @return exists True if the file exists, false otherwise
    function fileExists(uint256 fileId) external view returns (bool) {
        return _files[fileId].exists;
    }
}
