/* eslint-disable @typescript-eslint/no-explicit-any */

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'

import { expect } from 'chai'
import { ethers } from 'hardhat'

// TODO: Fix slow assertions on emitted event data

describe('CobraToken', function () {
  let cobraToken: any
  let account1: any
  let account2: any

  beforeEach(async () => {
    const CobraToken = await ethers.getContractFactory('CobraToken')
    cobraToken = await CobraToken.deploy()
    ;[account1, account2] = await ethers.getSigners()
  })

  it('should successfully deploy the CobraToken', async () => {
    expect(await cobraToken.name()).to.equal('Cobras')
    expect(await cobraToken.symbol()).to.equal('CBR')
  })

  describe('#buy()', async () => {
    it('should revert when the amount paid is too little', async () => {
      await expect(
        cobraToken.connect(account1).buy({
          value: ethers.utils.parseEther('0.1')
        })
      ).to.be.revertedWith('0.2 ETH')
    })

    it('should emit a Birth event when buying a Cobra', async () => {
      await cobraToken.connect(account1).buy({
        value: ethers.utils.parseEther('0.2')
      })

      await new Promise<void>((resolve) => {
        cobraToken.once(
          'Birth',
          (owner: any, cobraId: any, matronId: any, sireId: any, rarity: any, genes: any) => {
            expect(owner).to.equal(account1.address)
            expect(cobraId).to.equal(0)
            expect(matronId).to.equal(0)
            expect(sireId).to.equal(0)
            expect(rarity).to.be.within(1, 255)
            expect(genes).to.equal(1)
            resolve()
          }
        )
      })
    })
  })

  describe('#breed()', async () => {
    const matronId = 200
    const sireId = 400

    it('should revert when the amount paid is too little', async () => {
      await expect(
        cobraToken.connect(account1).breed(matronId, sireId, {
          value: ethers.utils.parseEther('0.01')
        })
      ).to.be.revertedWith('0.05 ETH')
    })

    it('should emit a Birth event when breeding a Cobra', async () => {
      await cobraToken.connect(account1).breed(matronId, sireId, {
        value: ethers.utils.parseEther('0.05')
      })

      await new Promise<void>((resolve) => {
        cobraToken.once(
          'Birth',
          (owner: any, cobraId: any, matronId: any, sireId: any, rarity: any, genes: any) => {
            expect(owner).to.equal(account1.address)
            expect(cobraId).to.equal(0)
            expect(matronId).to.equal(matronId)
            expect(sireId).to.equal(sireId)
            expect(rarity).to.be.within(1, 255)
            expect(genes).to.equal(5)
            resolve()
          }
        )
      })
    })
  })

  describe('#getDetails()', async () => {
    beforeEach(async () => {
      await cobraToken.connect(account1).buy({
        value: ethers.utils.parseEther('0.2')
      })
    })

    it("should return a Cobra's details", async () => {
      const cobraId = 0
      const matronId = 0
      const sireId = 0
      const genes = 1

      expect((await cobraToken.getDetails(cobraId))[0]).to.equal(cobraId)
      expect((await cobraToken.getDetails(cobraId))[1]).to.equal(matronId)
      expect((await cobraToken.getDetails(cobraId))[2]).to.equal(sireId)
      expect((await cobraToken.getDetails(cobraId))[3]).to.be.within(0, 255)
      expect((await cobraToken.getDetails(cobraId))[4]).to.equal(genes)
    })
  })

  describe('#listOwned()', async () => {
    beforeEach(async () => {
      // 1. Create 1 cobra for Account 1
      await cobraToken.connect(account1).buy({
        value: ethers.utils.parseEther('0.2')
      })
      // 2. Create 1 Cobra for Account 2
      await cobraToken.connect(account2).buy({
        value: ethers.utils.parseEther('0.2')
      })
      // 3. Create 1 Cobra for Account 1
      await cobraToken.connect(account1).buy({
        value: ethers.utils.parseEther('0.2')
      })
    })

    it('should return the owned Cobra ids', async () => {
      // Cobras owned by Account 1
      expect((await cobraToken.connect(account1).listOwned()).length).to.equal(2)
      expect((await cobraToken.connect(account1).listOwned())[0]).to.equal(0)
      expect((await cobraToken.connect(account1).listOwned())[1]).to.equal(2)
      // Cobras owned by Account 2
      expect((await cobraToken.connect(account2).listOwned()).length).to.equal(1)
      expect((await cobraToken.connect(account2).listOwned())[0]).to.equal(1)
    })
  })
})
