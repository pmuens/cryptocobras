/* eslint-disable @typescript-eslint/no-explicit-any */

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'

import { expect } from 'chai'
import { ethers } from 'hardhat'

// TODO: Fix slow assertions on emitted event data
// TODO: Don't run assertions outside the "core" test environment

async function oracleResponderMock(oracleAccount: any, oracle: any, cobraToken: any) {
  return new Promise<void>((resolve) => {
    oracle.once(
      'DataRequest',
      async (_: any, id: any, __: any, ___: any, cbFuncName: any, customData: any) => {
        // Rolling the dice...
        const result = 42
        const response = ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'uint64', 'bytes'],
          [id, result, customData]
        )
        resolve(cobraToken.connect(oracleAccount)[cbFuncName](response))
      }
    )
  })
}

describe('CobraToken', function () {
  let oracle: any
  let cobraToken: any
  let userAccount1: any
  let userAccount2: any
  let oracleAccount: any

  beforeEach(async () => {
    const Oracle = await ethers.getContractFactory('Oracle')
    oracle = await Oracle.deploy()
    const CobraToken = await ethers.getContractFactory('CobraToken')
    cobraToken = await CobraToken.deploy(oracle.address)
    ;[userAccount1, userAccount2, oracleAccount] = await ethers.getSigners()
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
            const [owner, matronId, sireId] = ethers.utils.defaultAbiCoder.decode(
              ['address', 'uint256', 'uint256'],
              customData
            )

            expect(sender).equal(cobraToken.address)
            expect(id).equal(0)
            expect(jobName).equal('random')
            expect(cbFuncName).equal('createCobra')
            expect(min).equal(0)
            expect(max).equal(999999999)
            expect(owner).equal(userAccount1.address)
            expect(matronId).equal(0)
            expect(sireId).equal(0)

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
      const matronId = 0
      const sireId = 0
      const rarity = 42
      const genes = 1
      await expect(oracleResponderMock(oracleAccount, oracle, cobraToken))
        .to.emit(cobraToken, 'Birth')
        .withArgs(userAccount1.address, cobraId, matronId, sireId, rarity, genes)
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
      const matronId = 0
      const sireId = 0
      const genes = 1

      const details = await cobraToken.getDetails(cobraId)

      expect(details[0]).to.equal(cobraId)
      expect(details[1]).to.equal(matronId)
      expect(details[2]).to.equal(sireId)
      expect(details[3]).to.be.within(0, 255)
      expect(details[4]).to.equal(genes)
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
