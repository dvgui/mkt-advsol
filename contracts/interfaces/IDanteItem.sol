// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

interface IDanteItemNFT is IERC1155Upgradeable {
	function mint(
		address account,
		uint256 id,
		uint256 amount,
		bytes memory data
	) external;

	function tokenTypes(uint256) external view returns (uint256);

	function burn(uint256 tokenId) external;
}
