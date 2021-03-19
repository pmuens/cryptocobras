//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./Oracle.sol";

contract CobraToken is ERC721 {
    using Counters for Counters.Counter;

    Oracle private _oracle;

    Counters.Counter private _cobraIds;
    Counters.Counter private _requestIds;

    struct Cobra {
        uint256 matronId;
        uint256 sireId;
        uint64 rarity;
        uint8 genes;
    }

    Cobra[] public cobras;

    event Success(address owner);

    event Birth(
        address owner,
        uint256 cobraId,
        uint256 matronId,
        uint256 sireId,
        uint64 rarity,
        uint8 genes
    );

    constructor(address oracleAddress) ERC721("Cobras", "CBR") {
        _oracle = Oracle(oracleAddress);
    }

    function buy() external payable {
        require(msg.value == 0.2 ether, "A Cobra costs exactly 0.2 ETH");

        address owner = msg.sender;
        uint256 matronId = 0;
        uint256 sireId = 0;

        uint64 min = 0;
        uint64 max = 999999999;

        uint256 id = _requestIds.current();
        string memory jobName = "random";
        bytes memory jobArgs = abi.encode(min, max);
        string memory cbFuncName = "createCobra";
        bytes memory customData = abi.encode(owner, matronId, sireId);

        _oracle.getExternalData(id, jobName, jobArgs, cbFuncName, customData);
        _requestIds.increment();

        emit Success(msg.sender);
    }

    function breed(uint256 matronId, uint256 sireId) external payable {
        require(msg.value == 0.05 ether, "Breeding Cobras costs 0.05 ETH");

        address owner = msg.sender;

        uint64 min = 0;
        uint64 max = 999999999;

        uint256 id = _requestIds.current();
        string memory jobName = "random";
        bytes memory jobArgs = abi.encode(min, max);
        string memory cbFuncName = "createCobra";
        bytes memory customData = abi.encode(owner, matronId, sireId);

        _oracle.getExternalData(id, jobName, jobArgs, cbFuncName, customData);
        _requestIds.increment();

        emit Success(msg.sender);
    }

    function getDetails(uint256 cobraId)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint64,
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

    // TODO: Update so that only the Oracle can call it
    function createCobra(bytes calldata response) external {
        // Decoding the response data
        uint256 id;
        uint64 result;
        bytes memory customData;
        (id, result, customData) = abi.decode(
            response,
            (uint256, uint64, bytes)
        );

        uint64 rarity = result;

        // Decoding the custom data passed along the response data
        address owner;
        uint256 matronId;
        uint256 sireId;
        (owner, matronId, sireId) = abi.decode(
            customData,
            (address, uint256, uint256)
        );

        require(owner != address(0), "Owner shouldn't be the 0 address");

        uint8 genes = _generateGenes(matronId, sireId);
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
    }

    function _generateGenes(uint256 matronId, uint256 sireId)
        internal
        pure
        returns (uint8)
    {
        return (uint8(matronId + sireId) % 6) + 1;
    }
}
