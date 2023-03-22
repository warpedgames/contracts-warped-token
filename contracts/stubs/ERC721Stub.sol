// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract ERC721Stub is ERC721PresetMinterPauserAutoId {
    constructor() ERC721PresetMinterPauserAutoId(
        "ERC721 Stub",
        "NFT Stub",
        "https://starlink.mypinata.cloud/ipfs/QmXQm4BDGdhJjPRjiJmSScs7XuRWz6pTRKeuUE2xgBAhFS/"
    ) {
    }
}