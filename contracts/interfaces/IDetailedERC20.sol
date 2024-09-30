// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDetailedERC20 is IERC20 {
	function decimals() external view returns (uint8);
}
