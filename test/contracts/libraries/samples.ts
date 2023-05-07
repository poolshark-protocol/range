import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { IRangePool } from '../../../typechain'
import { PoolState, BN_ZERO, validateMint, validateSwap } from '../../utils/contracts/rangepool'
import { gBefore } from '../../utils/hooks.test'
import { mintSigners20 } from '../../utils/token'

describe('Samples Library Tests', function () {
  let token0Amount: BigNumber
  let token1Amount: BigNumber
  let token0Decimals: number
  let token1Decimals: number
  let currentPrice: BigNumber

  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress

  const tokenAmount = ethers.utils.parseUnits('100', token1Decimals)
  const maxPrice = BigNumber.from('1461446703485210103287273052203988822378723970341')



  before(async function () {
    await gBefore()
    let currentBlock = await ethers.provider.getBlockNumber()

    const pool: PoolState = await hre.props.rangePool.poolState()
    const liquidity = pool.liquidity
    const price = pool.price

    expect(liquidity).to.be.equal(BN_ZERO)

    currentPrice = BigNumber.from('2').pow(96)
    token0Decimals = await hre.props.token0.decimals()
    token1Decimals = await hre.props.token1.decimals()
    token0Amount = ethers.utils.parseUnits('100', token0Decimals)
    token1Amount = ethers.utils.parseUnits('100', token1Decimals)
    alice = hre.props.alice
    bob = hre.props.bob
    carol = hre.props.carol

    await mintSigners20(hre.props.token0, token0Amount.mul(10), [hre.props.alice, hre.props.bob])

    await mintSigners20(hre.props.token1, token1Amount.mul(10), [hre.props.alice, hre.props.bob])
  })

  this.beforeEach(async function () {})

//   it('Should get accurate accumulator values', async function () {
//     await validateMint({
//         signer: hre.props.alice,
//         recipient: hre.props.alice.address,
//         lower: '10000',
//         upper: '20000',
//         amount0: tokenAmount,
//         amount1: tokenAmount,
//         fungible: true,
//         balance0Decrease: BigNumber.from('100000000000000000000'),
//         balance1Decrease: BigNumber.from('0'),
//         tokenAmount: BigNumber.from('170245243948753558591'),
//         liquidityIncrease: BigNumber.from('419027207938949970576'),
//         revertMessage: '',
//         collectRevertMessage: ''
//       })
  
//       await validateSwap({
//         signer: hre.props.alice,
//         recipient: hre.props.alice.address,
//         zeroForOne: false,
//         amountIn: tokenAmount,
//         sqrtPriceLimitX96: maxPrice,
//         balanceInDecrease: BigNumber.from('100000000000000000000'),
//         balanceOutIncrease: BigNumber.from('32121736932093337716'),
//         revertMessage: '',
//       })
//   })
})
