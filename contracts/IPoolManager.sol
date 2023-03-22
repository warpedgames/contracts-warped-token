// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title Exchange pool processor abstract contract.
 * @dev Keeps an enumerable set of designated exchange addresses as well as a single primary pool address.
 */
interface IPoolManager {

    /// @notice Primary exchange pool address.
    function primaryPool() external view returns (address);

    /**
     * @notice Check if the given address is pool address.
     * @param addr Address to check.
     * @return bool True if the given address is pool address.
     */
    function isPoolAddress(address addr) external view returns (bool);
}