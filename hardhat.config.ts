/* eslint-disable no-console */

import '@typechain/hardhat'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'

import { HardhatUserConfig, task } from 'hardhat/config'

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(await account.address)
  }
})

task('deploy', 'Deploys the Smart Contracts', async (_, hre) => {
  const Oracle = await hre.ethers.getContractFactory('Oracle')
  const oracle = await Oracle.deploy()
  const CobraToken = await hre.ethers.getContractFactory('CobraToken')
  const cobraToken = await CobraToken.deploy(oracle.address)

  console.log('Oracle deployed to:', oracle.address)
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
        'Success',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (owner: any) => {
          console.log('--- Successfully bought Cobra ---')
          console.log('Owner:', owner)
          console.log('--- Waiting on Oracle to finalize the minting ---')
          resolve()
        }
      )
    })
  })

task(
  'oracle',
  'Creates a mock Oracle response which invokes the callback function on the Cobra contract'
)
  .addParam('address', 'The CobraToken contract address')
  .setAction(async (args, hre) => {
    const id = 1234
    const cbFuncName = 'createCobra'

    const [owner, oracle] = await hre.ethers.getSigners()
    const cobraToken = await hre.ethers.getContractAt('CobraToken', args.address)

    const customData = hre.ethers.utils.defaultAbiCoder.encode(['address'], [owner.address])

    // Rolling the dice...
    const number = 42
    const result = hre.ethers.utils.defaultAbiCoder.encode(['uint64'], [number])
    await cobraToken.connect(oracle)[cbFuncName](id, result, customData)

    await new Promise<void>((resolve) => {
      cobraToken.once(
        'Birth',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (owner: any, cobraId: any, rarity: any, genes: any) => {
          console.log('--- Successfully minted Cobra ---')
          console.log('Owner:', owner)
          console.log('CobraId:', cobraId.toString())
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
