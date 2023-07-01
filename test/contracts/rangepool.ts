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
  getTickAtPrice,
  getRangeBalanceOf,
  getSnapshot,
  getSample,
} from '../utils/contracts/rangepool'

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

  ////////// DEBUG FLAGS //////////
  let debugMode           = false
  let balanceCheck        = false

  const liquidityAmount = BigNumber.from('49902591570441687020675')
  const liquidityAmount2 = BigNumber.from('50102591670431696268925')
  const liquidityAmount3 = BigNumber.from('3852877204305891777654')
  const minTickIdx = BigNumber.from('-887272')
  const maxTickIdx = BigNumber.from('887272')

  before(async function () {
    await gBefore()
    let currentBlock = await ethers.provider.getBlockNumber()
    const pool: PoolState = await hre.props.rangePool.poolState()
    const liquidity = pool.liquidity
    const feeGrowthGlobal0 = pool.feeGrowthGlobal0
    const feeGrowthGlobal1 = pool.feeGrowthGlobal1
    const price = pool.price
    const nearestTick = pool.tickAtPrice

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

  it('token1 - Should mint, swap, and burn 21', async function () {

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20',
      upper: '60',
      amount0: tokenAmount,
      amount1: tokenAmount,
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
      sqrtPriceLimitX96: BigNumber.from('79450223072165328185028130650'),
      balanceInDecrease: BigNumber.from('10000000000000000000'),
      balanceOutIncrease: BigNumber.from('10053126651581942488'),
      revertMessage: '',
    })

    if (debugMode) await getSnapshot(hre.props.alice.address, 20, 60)
    if (debugMode) await getSample()

    if (debugMode) await getRangeBalanceOf(hre.props.alice.address, 20, 60)
    if (debugMode) await getSnapshot(hre.props.alice.address, 20, 60)
    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: liquidityAmount,
      balance0Increase: tokenAmount.div(10).sub(1),
      balance1Increase: BigNumber.from('89946873348418057510'),
      revertMessage: '',
    })
    if (debugMode) await getSample()
    if (debugMode) await getSnapshot(hre.props.alice.address, 20, 60)
    if (debugMode){
      console.log('after burn')
      await getRangeBalanceOf(hre.props.alice.address, 20, 60)
    }

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token0 - Should mint, swap, and burn', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    const aliceLiquidity = BigNumber.from('55483175795606442088768')

    if (debugMode) await getTickAtPrice()

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20',
      upper: '60',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('11118295473149384055'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
      collectRevertMessage: ''
    })

    if (debugMode) await getTickAtPrice()

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('99620837864637861357'),
      balanceOutIncrease: BigNumber.from('99949999999999999999'),
      revertMessage: '',
    })

    if (debugMode) await getTickAtPrice()

    if (debugMode) await getRangeBalanceOf(hre.props.alice.address, 20, 60)
    if (debugMode) await getSnapshot(hre.props.alice.address, 20, 60)
    if (debugMode) await getSample()
    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: aliceLiquidity,
      balance0Increase: BigNumber.from('110739133337787245411'),
      balance1Increase: BigNumber.from('49999999999999999'),
      revertMessage: '',
    })

    if (debugMode){
      console.log('after burn')
      await getRangeBalanceOf(hre.props.alice.address, 20, 60)
    }

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token0 - Should mint and burn fungible position', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    const aliceLiquidity = BigNumber.from('419027207938949970576')
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '10000',
      upper: '20000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      tokenAmount: aliceLiquidity,
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: (await hre.props.rangePool.poolState()).price.add(3),
      balanceInDecrease: BigNumber.from('0'),
      balanceOutIncrease: BigNumber.from('0'),
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: (await hre.props.rangePool.poolState()).price,
      balanceInDecrease: BigNumber.from('0'),
      balanceOutIncrease: BigNumber.from('0'),
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: (await hre.props.rangePool.poolState()).price.sub(2),
      balanceInDecrease: BigNumber.from('0'),
      balanceOutIncrease: BigNumber.from('0'),
      revertMessage: '',
    })

    if (debugMode) await getSample()
    if (debugMode) await getRangeBalanceOf(hre.props.alice.address, 10000, 20000)
    if (debugMode) await getSnapshot(hre.props.alice.address, 10000, 20000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      tokenAmount: aliceLiquidity,
      liquidityAmount: aliceLiquidity,
      balance0Increase: tokenAmount.sub(1),
      balance1Increase: BN_ZERO,
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token0 - Should add in-range fungible liquidity', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '10000',
      upper: '20000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      tokenAmount: BigNumber.from('419027207938949970576'),
      liquidityIncrease: BigNumber.from('419027207938949970576'),
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
      balanceOutIncrease: BigNumber.from('32121736932093337716'),
      revertMessage: '',
    })

    if (debugMode) await getSample()
    if (debugMode) await getTickAtPrice()
    if (debugMode) await getSnapshot(hre.props.alice.address, 10000, 20000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      tokenAmount: BigNumber.from('419027207938949970576'),
      liquidityAmount: BigNumber.from('419027207938949970576'),
      balance0Increase: BigNumber.from('67878263067906662282'),
      balance1Increase: BigNumber.from('100000000000000000000').sub(1),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token1 - Should mint, swap, and burn', async function () {
    const liquidityAmount2 = BigNumber.from('690841800621472456980')

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20000',
      upper: '30000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: tokenAmount,
      balance1Decrease: BN_ZERO,
      tokenAmount: liquidityAmount2,
      liquidityIncrease: liquidityAmount2,
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.div(10),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('10000000000000000000'),
      balanceOutIncrease: BigNumber.from('1345645380966504669'),
      revertMessage: '',
    })
    if (debugMode) await getSample()
    if (debugMode) await getRangeBalanceOf(hre.props.alice.address, 25000, 30000)
    if (debugMode) await getSnapshot(hre.props.alice.address, 20000, 30000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '20000',
      upper: '30000',
      liquidityAmount: liquidityAmount2,
      balance0Increase: BigNumber.from('98654354619033495329'),
      balance1Increase: tokenAmount.div(10).sub(1),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token1 - Should mint, swap, and burn position while in range', async function () {
    if (debugMode) await getTickAtPrice()
    const aliceLiquidity = BigNumber.from('1577889144107833733009')
    const aliceLiquidity2 = BigNumber.from('1590926220637829792707')
    const aliceTokenAmount = BigNumber.from('3168808846234106973665')
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '25000',
      upper: '30000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: tokenAmount,
      balance1Decrease: BN_ZERO,
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.div(10),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('10000000000000000000'),
      balanceOutIncrease: BigNumber.from('819054826219841040'),
      revertMessage: '',
    })

    if (debugMode) await getSnapshot(hre.props.alice.address, 25000, 30000)

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '25000',
      upper: '30000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('10082623526365456124'),
      liquidityIncrease: aliceLiquidity2,
      revertMessage: '',
    })

    if (debugMode) await getSample()
    if (debugMode) await getRangeBalanceOf(hre.props.alice.address, 25000, 30000)
    if (debugMode) await getSnapshot(hre.props.alice.address, 25000, 30000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '25000',
      upper: '30000',
      tokenAmount: aliceTokenAmount,
      liquidityAmount: aliceLiquidity.add(aliceLiquidity2),
      balance0Increase: BigNumber.from('199180945173780158958'),
      balance1Increase: BigNumber.from('20082623526365456123'),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token0 - Should autocompound fungible position', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    const aliceLiquidity = BigNumber.from('3852877204305891777654')
    const aliceToken2 = BigNumber.from('7703654602399898969634')
    const aliceLiquidity2 = BigNumber.from('7705754408611783555308')
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BN_ZERO,
      balance1Decrease: tokenAmount,
      tokenAmount: aliceLiquidity,
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount.div(2),
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('50000000000000000000'),
      balanceOutIncrease: BigNumber.from('54487289918860678020'),
      revertMessage: '',
    })

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('90970905615086187051'),
      tokenAmount: aliceToken2,
      liquidityIncrease: BigNumber.from('7705754408611783555308'),
      revertMessage: '',
      collectRevertMessage: ''
    })

    if (debugMode) await getSnapshot(hre.props.alice.address, 500, 1000)
    if (debugMode) await getSample()
    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: aliceLiquidity.add(aliceToken2),
      liquidityAmount: aliceLiquidity.add(aliceLiquidity2),
      balance0Increase: BigNumber.from('150000000000000000000').sub(1),
      balance1Increase: BigNumber.from('136483615696225509029'),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token0 - Should autocompound fungible position and add liquidity', async function () {
    const aliceLiquidity = BigNumber.from('7705754408611783555308')
    const aliceLiquidity2 = BigNumber.from('3852877204305891777654')
    const aliceToken2 = BigNumber.from('3851318661512648798121')

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('90970905615086187051'),
      tokenAmount: aliceLiquidity,
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.div(2),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('50000000000000000000'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('46172841786879071879'), // token0 decrease in pool
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount.div(4),
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('25000000000000000000'),
      balanceOutIncrease: BigNumber.from('27122499921707680271'),
      revertMessage: '',
    })
    if (debugMode) await getSample()
    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.mul(2),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('86165162340599335983'),
      balanceOutIncrease: BigNumber.from('78764658213120928119'),
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.alice.address, 500, 1000)
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('0'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      tokenAmount: aliceToken2,
      liquidityIncrease: aliceLiquidity2,
      revertMessage: '',
      collectRevertMessage: ''
    })

    if (debugMode) await getSnapshot(hre.props.alice.address, 500, 1000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: aliceLiquidity.add(aliceToken2),
      liquidityAmount: BigNumber.from('11559154372605880114611'), //TODO: investigate
      balance0Increase: BigNumber.from('62500000000000000'),
      balance1Increase: BigNumber.from('300013568033977842760'),
      revertMessage: '',
    })
    if (debugMode) await getSample()
    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('token1 - Should mint position inside the other', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('0'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      tokenAmount: BigNumber.from('3852877204305891777654'),
      liquidityIncrease: BigNumber.from('3852877204305891777654'),
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount.div(2),
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('50000000000000000000'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('54487289918860678020'), // token0 decrease in pool
      revertMessage: '',
    })

    if (debugMode) await getTickAtPrice()

    await validateMint({
      signer: hre.props.bob,
      recipient: hre.props.bob.address,
      lower: '200',
      upper: '600',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('0'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      tokenAmount: BigNumber.from('4901161634764542438934'),
      liquidityIncrease: BigNumber.from('4901161634764542438934'),
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.alice.address, 200, 600)
    await validateBurn({
      signer: hre.props.bob,
      lower: '200',
      upper: '600',
      tokenAmount: BigNumber.from('4901161634764542438934'),
      liquidityAmount: BigNumber.from('4901161634764542438934'),
      balance0Increase: BigNumber.from('0'),
      balance1Increase: tokenAmount.sub(1),
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.alice.address, 500, 1000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: BigNumber.from('3852877204305891777654'),
      liquidityAmount: BigNumber.from('3852877204305891777654'),
      balance0Increase: BigNumber.from('50000000000000000000').sub(1),
      balance1Increase: BigNumber.from('45512710081139321979').sub(1),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('pool - Should mint position inside the other', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    const aliceLiquidity = BigNumber.from('7705754408611783555308')
    const bobLiquidity = BigNumber.from('12891478442546858467877')
    const bobLiquidity2 = BigNumber.from('4901161634764542438933')

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('90970905615086187051'),
      tokenAmount: aliceLiquidity,
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: BigNumber.from('82255474610179467046984074964'),
      balanceInDecrease: BigNumber.from('8404133769503785680'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('7801206245756322179'), // token0 decrease in pool
      revertMessage: '',
    })

    await validateMint({
      signer: hre.props.bob,
      recipient: hre.props.bob.address,
      lower: '600',
      upper: '800',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('31002239349424966834'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      tokenAmount: bobLiquidity,
      liquidityIncrease: bobLiquidity,
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.bob.address, 600, 800)
    await validateBurn({
      signer: hre.props.bob,
      lower: '600',
      upper: '800',
      tokenAmount: bobLiquidity2,
      liquidityAmount: bobLiquidity2,
      balance0Increase: BigNumber.from('11786622206938309591'),
      balance1Increase: BigNumber.from('38018615604156121196'),
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.bob.address, 600, 800)
    await validateBurn({
      signer: hre.props.bob,
      lower: '600',
      upper: '800',
      tokenAmount: bobLiquidity.sub(bobLiquidity2).add(2),
      liquidityAmount: bobLiquidity.sub(bobLiquidity2).add(2),
      balance0Increase: BigNumber.from('19215617142486657241'),
      balance1Increase: BigNumber.from('61981384395843878803'),
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.alice.address, 500, 1000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: aliceLiquidity,
      liquidityAmount: aliceLiquidity,
      balance0Increase: BigNumber.from('92198793754243677819'),
      balance1Increase: BigNumber.from('99375039384589972730'),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('pool - Should mint position inside the other and not steal fee share :: KEBABSEC', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    const aliceLiquidity = BigNumber.from('3852877204305891777654')
    const bobLiquidity = BigNumber.from('10356653617731432349576')

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('0'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('0'), // token0 decrease in pool
      revertMessage: '',
    })


    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('0'),
      balance1Decrease: tokenAmount,
      tokenAmount: aliceLiquidity,
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('92774696514123048139'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('99949999999999999999'), // token0 decrease in pool
      revertMessage: '',
    })

    await validateMint({
      signer: hre.props.bob,
      recipient: hre.props.bob.address,
      lower: '600',
      upper: '800',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: tokenAmount,
      balance1Decrease: BN_ZERO,
      tokenAmount: bobLiquidity,
      liquidityIncrease: bobLiquidity,
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.bob.address, 600, 800)
    await validateBurn({
      signer: hre.props.bob,
      lower: '600',
      upper: '800',
      tokenAmount: bobLiquidity.div(2),
      liquidityAmount: bobLiquidity.div(2),
      balance0Increase: BigNumber.from('50000000000000000000').sub(1),
      balance1Increase: BN_ZERO,
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.bob.address, 600, 800)
    await validateBurn({
      signer: hre.props.bob,
      lower: '600',
      upper: '800',
      tokenAmount: bobLiquidity.div(2),
      liquidityAmount: bobLiquidity.div(2),
      balance0Increase: BigNumber.from('50000000000000000000').sub(1),
      balance1Increase: BN_ZERO,
      revertMessage: '',
    })
    if (debugMode) await getSnapshot(hre.props.alice.address, 500, 1000)
    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: aliceLiquidity,
      liquidityAmount: aliceLiquidity,
      balance0Increase: BigNumber.from('92774696514123048138'),
      balance1Increase: BigNumber.from('49999999999999999'),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })

  it('pool - Should not underflow when crossing when exiting and entering position range :: KEBABSEC', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    const aliceLiquidity = BigNumber.from('4152939701311089823384')
    const bobLiquidity = BigNumber.from('10356653617731432349576')

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      balance0Decrease: BigNumber.from('0'),
      balance1Decrease: tokenAmount,
      tokenAmount: aliceLiquidity,
      liquidityIncrease: aliceLiquidity,
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.mul(2),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('107788010909609440040'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('99949999999999999999'), // token0 decrease in pool
      revertMessage: '',
    })

    // if (debugMode) await getSnapshot(hre.props.bob.address, 600, 800)
    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount.mul(2),
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('100000000000000000000'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('107734116904154635318'), // token0 decrease in pool
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.mul(2),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('107788010909609440040'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('99949999999999999999'), // token0 decrease in pool
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: aliceLiquidity,
      liquidityAmount: aliceLiquidity,
      balance0Increase: BigNumber.from('99999999999999999'),
      balance1Increase: BigNumber.from('107841904915064244759'),
      revertMessage: '',
    })

    if (balanceCheck) {
      console.log('balance after token0:', (await hre.props.token0.balanceOf(hre.props.rangePool.address)).toString())
      console.log('balance after token1:', (await hre.props.token1.balanceOf(hre.props.rangePool.address)).toString())
    }
  })
})