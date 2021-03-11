//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CobraToken is ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter private _cobraIds;
    Counters.Counter private _randNonce;

    struct Cobra {
        uint256 matronId;
        uint256 sireId;
        uint8 rarity;
        uint8 genes;
    }

    Cobra[] public cobras;

    event Birth(
        address owner,
        uint256 cobraId,
        uint256 matronId,
        uint256 sireId,
        uint8 rarity,
        uint8 genes
    );

    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721("Cobras", "CBR") {}

    function buy() external payable returns (uint256) {
        require(msg.value == 0.2 ether, "A Cobra costs exactly 0.2 ETH");
        return _createCobra(0, 0, msg.sender);
    }

    function breed(uint256 matronId, uint256 sireId)
        external
        payable
        returns (uint256)
    {
        require(msg.value == 0.05 ether, "Breeding Cobras costs 0.05 ETH");
        return _createCobra(matronId, sireId, msg.sender);
    }

    function getDetails(uint256 cobraId)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint8,
            uint8
        )
    {
        Cobra storage cobra = cobras[cobraId];
        return (
            cobraId,
            cobra.matronId,
            cobra.sireId,
            cobra.rarity,
            cobra.genes
        );
    }

    function listOwned() external view returns (uint256[] memory) {
        uint256 cobraCount = balanceOf(msg.sender);

        if (cobraCount == 0) {
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](cobraCount);
            uint256 resultIndex = 0;
            uint256 cobraId = 0;
            while (cobraId < _cobraIds.current()) {
                if (ownerOf(cobraId) == msg.sender) {
                    result[resultIndex] = cobraId;
                    resultIndex = resultIndex + 1;
                }
                cobraId = cobraId + 1;
            }
            return result;
        }
    }

    function _generateGenes(uint256 matronId, uint256 sireId)
        internal
        pure
        returns (uint8)
    {
        return (uint8(matronId + sireId) % 6) + 1;
    }

    function _generateRarity() internal returns (uint8) {
        // TODO: Update source of randomness
        _randNonce.increment();
        uint256 rand =
            uint256(
                keccak256(
                    abi.encodePacked(
                        // solhint-disable-next-line not-rely-on-time
                        block.timestamp,
                        msg.sender,
                        _randNonce.current()
                    )
                )
            );
        return uint8(rand);
    }

    function _createCobra(
        uint256 matronId,
        uint256 sireId,
        address owner
    ) internal returns (uint256) {
        require(owner != address(0), "Owner shouldn't be the 0 address");

        uint8 genes = _generateGenes(matronId, sireId);
        uint8 rarity = _generateRarity();
        Cobra memory cobra = Cobra(matronId, sireId, rarity, genes);

        cobras.push(cobra);
        uint256 cobraId = _cobraIds.current();
        _cobraIds.increment();

        super._mint(owner, cobraId);

        emit Birth(
            owner,
            cobraId,
            cobra.matronId,
            cobra.sireId,
            cobra.rarity,
            cobra.genes
        );

        return cobraId;
    }
}
