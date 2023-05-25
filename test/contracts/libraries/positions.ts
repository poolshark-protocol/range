// import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// import { expect } from 'chai'
// import { BigNumber } from 'ethers'
// import { IRangePool } from '../../../typechain'
// import { PoolState, BN_ZERO } from '../../utils/contracts/rangepool'
// import { gBefore } from '../../utils/hooks.test'
// import { mintSigners20 } from '../../utils/token'

// describe('Positions Library Tests', function () {
//   let token0Amount: BigNumber
//   let token1Amount: BigNumber
//   let token0Decimals: number
//   let token1Decimals: number
//   let currentPrice: BigNumber

//   let alice: SignerWithAddress
//   let bob: SignerWithAddress
//   let carol: SignerWithAddress



//   before(async function () {
//     await gBefore()
//     let currentBlock = await ethers.provider.getBlockNumber()

//     const pool: PoolState = await hre.props.rangePool.poolState()
//     const liquidity = pool.liquidity
//     const price = pool.price

//     expect(liquidity).to.be.equal(BN_ZERO)

//     currentPrice = BigNumber.from('2').pow(96)
//     token0Decimals = await hre.props.token0.decimals()
//     token1Decimals = await hre.props.token1.decimals()
//     token0Amount = ethers.utils.parseUnits('100', token0Decimals)
//     token1Amount = ethers.utils.parseUnits('100', token1Decimals)
//     alice = hre.props.alice
//     bob = hre.props.bob
//     carol = hre.props.carol

//     await mintSigners20(hre.props.token0, token0Amount.mul(10), [hre.props.alice, hre.props.bob])

//     await mintSigners20(hre.props.token1, token1Amount.mul(10), [hre.props.alice, hre.props.bob])
//   })

//   this.beforeEach(async function () {})

// })
