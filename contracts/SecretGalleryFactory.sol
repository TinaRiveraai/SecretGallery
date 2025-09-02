// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SecretGallery} from "./SecretGallery.sol";
import {ISecretGallery} from "./ISecretGallery.sol";

/// @title SecretGalleryFactory - Factory for creating SecretGallery instances
/// @notice Factory contract to deploy new SecretGallery contracts
/// @dev Allows users to create their own private galleries or shared galleries
contract SecretGalleryFactory {
    
    // Array of all deployed galleries
    address[] public galleries;
    
    // Mapping from owner to their deployed galleries
    mapping(address owner => address[] galleries) public ownerGalleries;
    
    // Mapping to check if an address is a valid gallery
    mapping(address gallery => bool valid) public isGallery;

    // Events
    event GalleryCreated(address indexed gallery, address indexed owner, uint256 timestamp);

    /// @notice Create a new SecretGallery instance
    /// @return gallery The address of the newly created gallery
    function createGallery() external returns (address gallery) {
        // Deploy new SecretGallery contract
        SecretGallery newGallery = new SecretGallery();
        gallery = address(newGallery);
        
        // Track the gallery
        galleries.push(gallery);
        ownerGalleries[msg.sender].push(gallery);
        isGallery[gallery] = true;
        
        emit GalleryCreated(gallery, msg.sender, block.timestamp);
    }

    /// @notice Get all galleries created by this factory
    /// @return allGalleries Array of all gallery addresses
    function getAllGalleries() external view returns (address[] memory) {
        return galleries;
    }

    /// @notice Get galleries created by a specific owner
    /// @param owner The owner address
    /// @return ownerGals Array of gallery addresses owned by the address
    function getOwnerGalleries(address owner) external view returns (address[] memory) {
        return ownerGalleries[owner];
    }

    /// @notice Get the total number of galleries created
    /// @return count The total number of galleries
    function getGalleryCount() external view returns (uint256) {
        return galleries.length;
    }

    /// @notice Check if an address is a valid gallery created by this factory
    /// @param galleryAddress The address to check
    /// @return valid True if the address is a valid gallery, false otherwise
    function isValidGallery(address galleryAddress) external view returns (bool) {
        return isGallery[galleryAddress];
    }

    /// @notice Get gallery information
    /// @param galleryAddress The gallery address
    /// @return isValid True if the gallery is valid
    /// @return fileCount The current file count in the gallery
    function getGalleryInfo(address galleryAddress) external view returns (bool isValid, uint256 fileCount) {
        isValid = isGallery[galleryAddress];
        if (isValid) {
            try ISecretGallery(galleryAddress).getCurrentFileId() returns (uint256 count) {
                fileCount = count;
            } catch {
                fileCount = 0;
            }
        }
    }
}