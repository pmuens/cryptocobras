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
