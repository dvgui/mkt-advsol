// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IHeroNFT is IERC721 {
	function safeMint(address to, uint nftType) external;

	function tokenTypes(uint256) external view returns (uint256);

	function burn(uint256 tokenId) external;
}
