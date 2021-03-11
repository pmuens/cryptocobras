/* eslint-disable no-console */

import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import { HardhatUserConfig, task } from 'hardhat/config'

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(await account.address)
  }
})

task('deploy', 'Deploys the CobraToken contract', async (_, hre) => {
  const CobraToken = await hre.ethers.getContractFactory('CobraToken')
  const cobraToken = await CobraToken.deploy()

  await cobraToken.deployed()

  console.log('CobraToken deployed to:', cobraToken.address)
})

task('buy', 'Buys a new Cobra NFT')
  .addParam('address', 'The CobraToken contract address')
  .setAction(async (args, hre) => {
    const [owner] = await hre.ethers.getSigners()
    const cobraToken = await hre.ethers.getContractAt('CobraToken', args.address)

    await cobraToken.connect(owner).buy({
      value: hre.ethers.utils.parseEther('0.2')
    })

    await new Promise<void>((resolve) => {
      cobraToken.once(
        'Birth',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (owner: any, cobraId: any, matronId: any, sireId: any, rarity: any, genes: any) => {
          console.log('--- Successfully bought Cobra ---')
          console.log('Owner:', owner)
          console.log('CobraId:', cobraId.toString())
          console.log('Matron:', matronId.toString())
          console.log('Sire:', sireId.toString())
          console.log('Rarity:', rarity.toString())
          console.log('Genes:', genes.toString())
          resolve()
        }
      )
    })
  })

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.0'
  },
  paths: {
    sources: 'contracts',
    tests: 'tests',
    cache: 'cache',
    artifacts: 'artifacts'
  }
}

export default config
