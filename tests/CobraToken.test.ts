/* eslint-disable @typescript-eslint/no-explicit-any */

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'

import { expect } from 'chai'
import { ethers } from 'hardhat'

import { Oracle } from '../typechain/Oracle'
import { CobraToken } from '../typechain/CobraToken'

// TODO: Fix slow assertions on emitted event data
// TODO: Don't run assertions outside the "core" test environment

async function oracleResponderMock(
  oracleAccount: any,
  oracle: Oracle,
  cobraToken: CobraToken,
  requestId?: any
) {
  return new Promise<void>((resolve) => {
    oracle.once(
      'DataRequest',
      async (_: any, id: any, __: any, ___: any, cbFuncName: any, customData: any) => {
        id = requestId || id
        // Rolling the dice...
        const number = 42
        const result = ethers.utils.defaultAbiCoder.encode(['uint64'], [number])
        resolve(cobraToken.connect(oracleAccount)[cbFuncName](id, result, customData))
      }
    )
  })
}

describe('CobraToken', function () {
  let oracle: Oracle
  let cobraToken: CobraToken
  let userAccount1: any
  let userAccount2: any
  let oracleAccount: any

  beforeEach(async () => {
    ;[userAccount1, userAccount2, oracleAccount] = await ethers.getSigners()
    const oracleFactory = await ethers.getContractFactory('Oracle', userAccount1)
    oracle = (await oracleFactory.deploy()) as Oracle
    await oracle.deployed()
    const cobraTokenFactory = await ethers.getContractFactory('CobraToken', userAccount1)
    cobraToken = (await cobraTokenFactory.deploy(oracle.address)) as CobraToken
    await cobraToken.deployed()
  })

  it('should successfully deploy the CobraToken', async () => {
    expect(await cobraToken.name()).to.equal('Cobras')
    expect(await cobraToken.symbol()).to.equal('CBR')
  })

  describe('#buy()', async () => {
    it('should revert when the amount paid is too little', async () => {
      await expect(
        cobraToken.connect(userAccount1).buy({
          value: ethers.utils.parseEther('0.1')
        })
      ).to.be.revertedWith('0.2 ETH')
    })

    it('should pass the correct request data to the Oracle', async () => {
      await cobraToken.connect(userAccount1).buy({
        value: ethers.utils.parseEther('0.2')
      })

      await new Promise<void>((resolve) => {
        oracle.once(
          'DataRequest',
          async (
            sender: any,
            id: any,
            jobName: any,
            jobArgs: any,
            cbFuncName: any,
            customData: any
          ) => {
            const [min, max] = ethers.utils.defaultAbiCoder.decode(['uint64', 'uint64'], jobArgs)
            const [owner] = ethers.utils.defaultAbiCoder.decode(['address'], customData)

            expect(sender).equal(cobraToken.address)
            expect(id).equal(0)
            expect(jobName).equal('random')
            expect(cbFuncName).equal('createCobra')
            expect(min).equal(0)
            expect(max).equal(999999999)
            expect(owner).equal(userAccount1.address)

            resolve()
          }
        )
      })
    })

    it('should emit a Success event when a Cobra is bought', async () => {
      await expect(
        cobraToken.connect(userAccount1).buy({
          value: ethers.utils.parseEther('0.2')
        })
      )
        .to.emit(cobraToken, 'Success')
        .withArgs(userAccount1.address)
    })

    it('should emit a Birth event when the Cobra is created', async () => {
      await cobraToken.connect(userAccount1).buy({
        value: ethers.utils.parseEther('0.2')
      })

      const cobraId = 0
      const rarity = 42
      const genes = 144
      await expect(oracleResponderMock(oracleAccount, oracle, cobraToken))
        .to.emit(cobraToken, 'Birth')
        .withArgs(userAccount1.address, cobraId, rarity, genes)
    })

    it('should not process the same response multiple times', async () => {
      const requestId = 42

      // Buying a Cobra the first time
      await cobraToken.connect(userAccount1).buy({
        value: ethers.utils.parseEther('0.2')
      })
      await expect(oracleResponderMock(oracleAccount, oracle, cobraToken, requestId)).to.emit(
        cobraToken,
        'Birth'
      )

      // Buying a Cobra for the second time
      await cobraToken.connect(userAccount1).buy({
        value: ethers.utils.parseEther('0.2')
      })
      // Glitch: Sending a response for the first request a second time
      await expect(
        oracleResponderMock(oracleAccount, oracle, cobraToken, requestId)
      ).to.be.revertedWith('already processed')
    })
  })

  describe('#getDetails()', async () => {
    beforeEach(async () => {
      await cobraToken.connect(userAccount1).buy({
        value: ethers.utils.parseEther('0.2')
      })
      await oracleResponderMock(oracleAccount, oracle, cobraToken)
    })

    it("should return a Cobra's details", async () => {
      const cobraId = 0
      const genes = 144

      const details = await cobraToken.getDetails(cobraId)

      expect(details[0]).to.equal(userAccount1.address)
      expect(details[1]).to.equal(cobraId)
      expect(details[2]).to.equal(42)
      expect(details[3]).to.equal(genes)
    })
  })

  describe('#listOwned()', async () => {
    beforeEach(async () => {
      // 1. Create 1 cobra for user account 1
      await cobraToken.connect(userAccount1).buy({
        value: ethers.utils.parseEther('0.2')
      })
      await oracleResponderMock(oracleAccount, oracle, cobraToken)
      // 2. Create 1 Cobra for user account 2
      await cobraToken.connect(userAccount2).buy({
        value: ethers.utils.parseEther('0.2')
      })
      await oracleResponderMock(oracleAccount, oracle, cobraToken)
      // 3. Create 1 Cobra for user account 1
      await cobraToken.connect(userAccount1).buy({
        value: ethers.utils.parseEther('0.2')
      })
      await oracleResponderMock(oracleAccount, oracle, cobraToken)
    })

    it('should return the owned Cobra ids', async () => {
      // Cobras owned by user account 1
      const ownedBy1 = await cobraToken.connect(userAccount1).listOwned()
      expect(ownedBy1.length).to.equal(2)
      expect(ownedBy1[0]).to.equal(0)
      expect(ownedBy1[1]).to.equal(2)
      // Cobras owned by user account 2
      const ownedBy2 = await cobraToken.connect(userAccount2).listOwned()
      expect(ownedBy2.length).to.equal(1)
      expect(ownedBy2[0]).to.equal(1)
    })
  })
})
