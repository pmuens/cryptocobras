//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

contract Oracle {
    string public version = "0.1.0";

    event DataRequest(
        address sender,
        uint256 id,
        string jobName,
        bytes jobArgs,
        string cbFuncName,
        bytes customData
    );

    function getExternalData(
        uint256 id,
        string memory jobName,
        bytes memory jobArgs,
        string memory cbFuncName,
        bytes memory customData
    ) external {
        emit DataRequest(
            msg.sender,
            id,
            jobName,
            jobArgs,
            cbFuncName,
            customData
        );
    }
}
