# CryptoCobras

NFT example application for EVM-based Blockchains.

**NOTE:** This NFT implementation is based on [openberry-ac/cryptovipers](https://github.com/openberry-ac/cryptovipers).

## Usage

You want to explore the [contracts](./contracts) and [tests](./tests) to see the dApps APIs and their usages.

1. `npx hardhat node`
2. `npx hardhat deploy --network localhost`
3. `npx hardhat buy --address <cobra-token-contract-address> --network localhost`
4. `npx hardhat oracle --address <cobra-token-contract-address> --network localhost`

## Useful Commands

```sh
# Setup
npm install

# Build
npm run build

# Test
npm run test

# Deploy
npm run deploy

# Format
npm run format

# Lint
npm run lint

# Clean
npm run clean
```
