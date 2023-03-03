/* global describe it before ethers */
const hardhat = require('hardhat')
const { expect } = require('chai')
import { gBefore } from '../utils/hooks.test'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { mintSigners20 } from '../utils/token'
import {
  validateMint,
  BN_ZERO,
  validateSwap,
  validateBurn,
  PoolState,
} from '../utils/contracts/rangepool'

// TODO: ✔ pool - Should handle partial mint (479ms)
// position before liquidity: BigNumber { _hex: '0x00', _isBigNumber: true }
//     1) pool - Should handle partial range cross w/ unfilled amount
/// ^this causes infinite tick loop

alice: SignerWithAddress
describe('RangePool Tests', function () {
  let tokenAmount: BigNumber
  let token0Decimals: number
  let token1Decimals: number
  let minPrice: BigNumber
  let maxPrice: BigNumber

  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress

  const liquidityAmount = BigNumber.from('49902591570441687020675')
  const minTickIdx = BigNumber.from('-887272')
  const maxTickIdx = BigNumber.from('887272')

  //every test should clear out all liquidity

  before(async function () {
    await gBefore()
    let currentBlock = await ethers.provider.getBlockNumber()
    //TODO: maybe just have one view function that grabs all these
    //TODO: map it to an interface
    const pool: PoolState = await hre.props.rangePool.poolState()
    const liquidity = pool.liquidity
    const feeGrowthGlobal0 = pool.feeGrowthGlobal0
    const feeGrowthGlobal1 = pool.feeGrowthGlobal1
    const price = pool.price
    const nearestTick = pool.nearestTick

    expect(liquidity).to.be.equal(BN_ZERO)

    minPrice = BigNumber.from('4295128739')
    maxPrice = BigNumber.from('1461446703485210103287273052203988822378723970341')
    token0Decimals = await hre.props.token0.decimals()
    token1Decimals = await hre.props.token1.decimals()
    tokenAmount = ethers.utils.parseUnits('100', token0Decimals)
    tokenAmount = ethers.utils.parseUnits('100', token1Decimals)
    alice = hre.props.alice
    bob = hre.props.bob
    carol = hre.props.carol
  })

  this.beforeEach(async function () {
    await mintSigners20(hre.props.token0, tokenAmount.mul(10), [hre.props.alice, hre.props.bob])

    await mintSigners20(hre.props.token1, tokenAmount.mul(10), [hre.props.alice, hre.props.bob])
  })

  //TODO: add liquidity in-range
  //TODO: price limit hit mid-tick zeroForOne true & false
  //TODO: add liquidity to existing tick

  it('token1 - Should mint, swap, and burn', async function () {

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lowerOld: '-887272',
      lower: '20',
      upper: '60',
      upperOld: '887272',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: false,
      balance0Decrease: BN_ZERO,
      balance1Decrease: tokenAmount,
      liquidityIncrease: liquidityAmount,
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount.div(10),
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('10000000000000000000'),
      balanceOutIncrease: BigNumber.from('10053127661680239327'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '40',
      liquidityAmount: liquidityAmount,
      fungible: false,
      balance0Increase: BN_ZERO,
      balance1Increase: tokenAmount.sub(1),
      revertMessage: 'NotEnoughPositionLiquidity()',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: liquidityAmount,
      fungible: false,
      balance0Increase: BigNumber.from('9999999999999999999'),
      balance1Increase: BigNumber.from('89946872338319760673'),
      revertMessage: '',
    })
  })

  it('token0 - Should mint, swap, and burn', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lowerOld: '-887272',
      lower: '20',
      upper: '60',
      upperOld: '887272',
      amount0: tokenAmount,
      amount1: BN_ZERO,
      fungible: false,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      liquidityIncrease: BigNumber.from('50102591670431696268925'),
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('100000000000000000000'),
      balanceOutIncrease: BigNumber.from('99551911445300376661'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: BigNumber.from('50102591670431696268925'),
      fungible: false,
      balance0Increase: BigNumber.from('448088554699623339'),
      balance1Increase: BigNumber.from('99999999999999999999'),
      revertMessage: '',
    })
  })

  it('token0 - Should mint and burn fungible position', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lowerOld: '-887272',
      lower: '10000',
      upper: '20000',
      upperOld: '887272',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      liquidityIncrease: BigNumber.from('419027207938949970576'),
      revertMessage: '',
      collectRevertMessage: 'RangeErc20NotFound()'
    })

  //   await validateSwap({
  //     signer: hre.props.alice,
  //     recipient: hre.props.alice.address,
  //     zeroForOne: false,
  //     amountIn: tokenAmount,
  //     sqrtPriceLimitX96: maxPrice,
  //     balanceInDecrease: BigNumber.from('100000000000000000000'),
  //     balanceOutIncrease: BigNumber.from('99551911445300376661'),
  //     revertMessage: '',
  //   })

    // reverts because fungible passed as false
    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      liquidityAmount: BigNumber.from('170245243948753558591'),
      fungible: false,
      balance0Increase: BN_ZERO,
      balance1Increase: BN_ZERO,
      revertMessage: 'NotEnoughPositionLiquidity()',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      liquidityAmount: BigNumber.from('419027207938949970577'),
      fungible: true,
      balance0Increase: BN_ZERO,
      balance1Increase: BN_ZERO,
      revertMessage: 'ERC20: burn amount exceeds balance',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      tokenAmount: BigNumber.from('419027207938949970576'),
      liquidityAmount: BigNumber.from('419027207938949970576'),
      fungible: true,
      balance0Increase: BigNumber.from('100000000000000000000'),
      balance1Increase: BigNumber.from('0'),
      revertMessage: '',
    })
  })

  it('token0 - Should add in-range liquidity', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lowerOld: '-887272',
      lower: '10000',
      upper: '20000',
      upperOld: '887272',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      liquidityIncrease: BigNumber.from('419027207938949970576'),
      revertMessage: '',
      collectRevertMessage: 'RangeErc20NotFound()'
    })

  //   await validateSwap({
  //     signer: hre.props.alice,
  //     recipient: hre.props.alice.address,
  //     zeroForOne: false,
  //     amountIn: tokenAmount,
  //     sqrtPriceLimitX96: maxPrice,
  //     balanceInDecrease: BigNumber.from('100000000000000000000'),
  //     balanceOutIncrease: BigNumber.from('99551911445300376661'),
  //     revertMessage: '',
  //   })

    // reverts because fungible passed as false
    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      liquidityAmount: BigNumber.from('170245243948753558591'),
      fungible: false,
      balance0Increase: BN_ZERO,
      balance1Increase: BN_ZERO,
      revertMessage: 'NotEnoughPositionLiquidity()',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      liquidityAmount: BigNumber.from('419027207938949970577'),
      fungible: true,
      balance0Increase: BN_ZERO,
      balance1Increase: BN_ZERO,
      revertMessage: 'ERC20: burn amount exceeds balance',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      tokenAmount: BigNumber.from('419027207938949970576'),
      liquidityAmount: BigNumber.from('419027207938949970576'),
      fungible: true,
      balance0Increase: BigNumber.from('100000000000000000000'),
      balance1Increase: BigNumber.from('0'),
      revertMessage: '',
    })
  })

})
