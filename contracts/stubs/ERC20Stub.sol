// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../LenientReentrancyGuard.sol";
import "../interfaces/ITreasuryHandler.sol";

contract ERC20Stub is ERC20, LenientReentrancyGuard {

    constructor(uint256 _totalSupply) ERC20("Test ERC20", "TestToken") {        
        _mint(_msgSender(), _totalSupply);
    }

    function testTreausryHandler(address treasury, address from, address to, uint256 amount) external nonReentrant {
        ITreasuryHandler handler = ITreasuryHandler(treasury);
        handler.processTreasury(from, to, amount);
    }
}