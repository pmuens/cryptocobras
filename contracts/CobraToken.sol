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

    mapping(uint256 => bool) private _processedResponses;

    struct Cobra {
        address owner;
        uint256 id;
        uint64 rarity;
        uint8 genes;
    }

    Cobra[] public cobras;

    event Success(address owner);
    event Birth(address owner, uint256 id, uint64 rarity, uint8 genes);

    constructor(address oracleAddress) ERC721("Cobras", "CBR") {
        _oracle = Oracle(oracleAddress);
    }

    function buy() external payable {
        require(msg.value == 0.2 ether, "A Cobra costs exactly 0.2 ETH");

        address owner = msg.sender;

        uint64 min = 0;
        uint64 max = 999999999;

        uint256 id = _requestIds.current();
        string memory jobName = "random";
        bytes memory jobArgs = abi.encode(min, max);
        string memory cbFuncName = "createCobra";
        bytes memory customData = abi.encode(owner);

        _oracle.getExternalData(id, jobName, jobArgs, cbFuncName, customData);
        _requestIds.increment();

        emit Success(msg.sender);
    }

    function getDetails(uint256 cobraId)
        external
        view
        returns (
            address,
            uint256,
            uint64,
            uint8
        )
    {
        Cobra storage cobra = cobras[cobraId];
        return (cobra.owner, cobra.id, cobra.rarity, cobra.genes);
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
    function createCobra(
        uint256 id,
        bytes calldata result,
        bytes calldata customData
    ) external {
        require(!_processedResponses[id], "Response already processed");

        uint64 rarity;
        (rarity) = abi.decode(result, (uint64));

        address owner;
        (owner) = abi.decode(customData, (address));

        require(owner != address(0), "Owner shouldn't be the 0 address");

        uint256 cobraId = _cobraIds.current();
        uint8 genes = _generateGenes(owner);
        Cobra memory cobra = Cobra(owner, cobraId, rarity, genes);

        cobras.push(cobra);
        _cobraIds.increment();

        super._mint(owner, cobraId);

        emit Birth(owner, cobraId, rarity, genes);

        _processedResponses[id] = true;
    }

    function _generateGenes(address owner) internal pure returns (uint8) {
        uint64 magicNumber = 42;
        return (uint8(uint160(owner) + magicNumber));
    }
}
