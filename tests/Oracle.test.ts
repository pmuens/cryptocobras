/* eslint-disable @typescript-eslint/no-explicit-any */

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'

import { expect } from 'chai'
import { ethers } from 'hardhat'

import { Oracle } from '../typechain/Oracle'

describe('Oracle', function () {
  let oracle: Oracle
  let account: any

  beforeEach(async () => {
    ;[account] = await ethers.getSigners()
    const oracleFactory = await ethers.getContractFactory('Oracle', account)
    oracle = (await oracleFactory.deploy()) as Oracle
    await oracle.deployed()
  })

  it('should successfully deploy the contract', async () => {
    expect(await oracle.version()).to.equal('0.1.0')
  })

  describe('#getExternalData()', async () => {
    it('should emit a DataRequest event with the data request information', async () => {
      const min = 0
      const max = 100

      const id = 1234
      const jobName = 'random'
      const jobArgs = ethers.utils.defaultAbiCoder.encode(['uint64', 'uint64'], [min, max])
      const cbFuncName = 'continueHere'
      const customData = ethers.utils.defaultAbiCoder.encode(['uint8', 'string'], [42, 'retained'])

      await expect(
        oracle.connect(account).getExternalData(id, jobName, jobArgs, cbFuncName, customData)
      )
        .to.emit(oracle, 'DataRequest')
        .withArgs(account.address, id, jobName, jobArgs, cbFuncName, customData)
    })
  })
})
