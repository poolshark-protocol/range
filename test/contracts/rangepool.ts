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
  const liquidityAmount2 = BigNumber.from('50102591670431696268925')
  const liquidityAmount3 = BigNumber.from('3852877204305891777654')
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

  it('token1 - Should mint, swap, and burn 11', async function () {

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20',
      upper: '60',
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
      sqrtPriceLimitX96: BigNumber.from('79450223072165328185028130650'),
      balanceInDecrease: BigNumber.from('10000000000000000000'),
      balanceOutIncrease: BigNumber.from('10053126651581942488'),
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
      balance0Increase: BigNumber.from('10000000000000000000'),
      balance1Increase: BigNumber.from('89946873348418057511'),
      revertMessage: '',
    })
  })

  it('token0 - Should mint, swap, and burn 11', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20',
      upper: '60',
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
      balanceOutIncrease: BigNumber.from('99551812394027374632'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: BigNumber.from('50102591670431696268925'),
      fungible: false,
      balance0Increase: BigNumber.from('448187605972625367'),
      balance1Increase: BigNumber.from('100000000000000000000'),
      revertMessage: '',
    })
  })

  it('token0 - Should mint and burn fungible position 11', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '10000',
      upper: '20000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
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
      revertMessage: 'BurnExceedsBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 2236771031221735906744102008774832778161797975119947154210717982934819779160, 419027207938949970577)',
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

  it('token0 - Should add in-range fungible liquidity 11', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()
    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '10000',
      upper: '20000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
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
      revertMessage: 'BurnExceedsBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 2236771031221735906744102008774832778161797975119947154210717982934819779160, 419027207938949970577)',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '10000',
      upper: '20000',
      tokenAmount: BigNumber.from('419027207938949970576'),
      liquidityAmount: BigNumber.from('419027207938949970576'),
      fungible: true,
      balance0Increase: BigNumber.from('67878263067906662283'),
      balance1Increase: BigNumber.from('100000000000000000000'),
      revertMessage: '',
    })
  })

  it('token1 - Should mint, swap, and burn', async function () {
    const liquidityAmount2 = BigNumber.from('50102591670431696268925')

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20',
      upper: '60',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: false,
      balance0Decrease: tokenAmount,
      balance1Decrease: BN_ZERO,
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
      balanceOutIncrease: BigNumber.from('9973042439282787765'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '40',
      liquidityAmount: liquidityAmount2,
      fungible: false,
      balance0Increase: BN_ZERO,
      balance1Increase: tokenAmount.sub(1),
      revertMessage: 'NotEnoughPositionLiquidity()',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: liquidityAmount2,
      fungible: false,
      balance0Increase: BigNumber.from('90026957560717212234'),
      balance1Increase: BigNumber.from('10000000000000000000'),
      revertMessage: '',
    })
  })

  it('token1 - Should mint, swap, and burn custom position while in range', async function () {

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20',
      upper: '60',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: false,
      balance0Decrease: tokenAmount,
      balance1Decrease: BN_ZERO,
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
      balanceOutIncrease: BigNumber.from('9973042439282787765'),
      revertMessage: '',
    })

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '20',
      upper: '60',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: false,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('11108399606927461884'),
      liquidityIncrease: BigNumber.from('55655960961787058072954'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '20',
      upper: '60',
      liquidityAmount: liquidityAmount2.add(BigNumber.from('55655960961787058072954')),
      fungible: false,
      balance0Increase: BigNumber.from('190021968544989707088'),
      balance1Increase: BigNumber.from('21108399606927461884'),
      revertMessage: '',
    })
  })

  it('token0 - Should autocompound fungible position', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      tokenAmount: BigNumber.from('4152939701311089823384'),
      liquidityIncrease: BigNumber.from('4152939701311089823384'),
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.div(2),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('50000000000000000000'),
      balanceOutIncrease: BigNumber.from('46986079114717368335'),
      revertMessage: '',
    })

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('94356685012507865298'),
      tokenAmount: BigNumber.from('7835310791950434814745'),
      liquidityIncrease: BigNumber.from('7837152465450979996912'),
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: BigNumber.from('11988250493261524638130'),
      liquidityAmount: BigNumber.from('11986657697951620560434'),
      fungible: true,
      balance0Increase: BigNumber.from('153013648220322291925'),
      balance1Increase: BigNumber.from('144243177493286617045'),
      revertMessage: 'BurnExceedsBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 2381093050879867228278279701469820094323623974324911225843268442440969283554, 11988250493261524638130)',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: BigNumber.from('11988250493261524638129'),
      liquidityAmount: BigNumber.from('11990092166762069820296'),
      fungible: true,
      balance0Increase: BigNumber.from('153013920885282631664'),
      balance1Increase: BigNumber.from('144356685012507865298'),
      revertMessage: '',
    })
  })

  it('token0 - Should autocompound fungible position and add liquidity', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      tokenAmount: BigNumber.from('4152939701311089823384'),
      liquidityIncrease: BigNumber.from('4152939701311089823384'),
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
      balanceOutIncrease: BigNumber.from('46986079114717368335'), // token0 decrease in pool
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: true,
      amountIn: tokenAmount.div(4),
      sqrtPriceLimitX96: minPrice,
      balanceInDecrease: BigNumber.from('25000000000000000000'),
      balanceOutIncrease: BigNumber.from('26722233818729405092'),
      revertMessage: '',
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount.mul(2),
      sqrtPriceLimitX96: maxPrice,
      balanceInDecrease: BigNumber.from('84523612529148614720'),
      balanceOutIncrease: BigNumber.from('77990416093329296312'),
      revertMessage: '',
    })

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('0'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      tokenAmount: BigNumber.from('3851494258715939638949'),
      liquidityIncrease: BigNumber.from('3852877204305891777654'),
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: BigNumber.from('8004433960027029462334'),
      liquidityAmount: BigNumber.from('11986657697951620560434'),
      fungible: true,
      balance0Increase: BigNumber.from('153013648220322291925'),
      balance1Increase: BigNumber.from('144243177493286617045'),
      revertMessage: 'BurnExceedsBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 2381093050879867228278279701469820094323623974324911225843268442440969283554, 8004433960027029462334)',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: BigNumber.from('8004433960027029462333'),
      liquidityAmount: BigNumber.from('8006331950567098231863'),
      fungible: true,
      balance0Increase: BigNumber.from('23504791953335351'),
      balance1Increase: BigNumber.from('207801378710419209627'),
      revertMessage: '',
    })
  })

  it('token0 - Should mint position inside the other', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
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

    await validateMint({
      signer: hre.props.bob,
      recipient: hre.props.bob.address,
      lower: '200',
      upper: '600',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('0'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      tokenAmount: BigNumber.from('4901161634764542438934'),
      liquidityIncrease: BigNumber.from('4901161634764542438934'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.bob,
      lower: '200',
      upper: '600',
      tokenAmount: BigNumber.from('4901161634764542438934'),
      liquidityAmount: BigNumber.from('4901161634764542438934'),
      fungible: true,
      balance0Increase: BigNumber.from('0'),
      balance1Increase: BigNumber.from('100000000000000000000'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: BigNumber.from('3852877204305891777654'),
      liquidityAmount: BigNumber.from('3852877204305891777654'),
      fungible: true,
      balance0Increase: BigNumber.from('50000000000000000000'),
      balance1Increase: BigNumber.from('45512710081139321979'),
      revertMessage: '',
    })
  })

  it('pool - Should mint position inside the other', async function () {
    const pool: PoolState = await hre.props.rangePool.poolState()

    await validateMint({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      lower: '500',
      upper: '1000',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('100000000000000000000'),
      balance1Decrease: BigNumber.from('0'),
      tokenAmount: BigNumber.from('4152939701311089823384'),
      liquidityIncrease: BigNumber.from('4152939701311089823384'),
      revertMessage: '',
      collectRevertMessage: ''
    })

    await validateSwap({
      signer: hre.props.alice,
      recipient: hre.props.alice.address,
      zeroForOne: false,
      amountIn: tokenAmount,
      sqrtPriceLimitX96: BigNumber.from('82255474610179467046984074964'),
      balanceInDecrease: BigNumber.from('53557189146645258776'), // token1 increase in pool
      balanceOutIncrease: BigNumber.from('50287324067551161127'), // token0 decrease in pool
      revertMessage: '',
    })

    await validateMint({
      signer: hre.props.bob,
      recipient: hre.props.bob.address,
      lower: '600',
      upper: '800',
      amount0: tokenAmount,
      amount1: tokenAmount,
      fungible: true,
      balance0Decrease: BigNumber.from('31002239349424966834'),
      balance1Decrease: BigNumber.from('100000000000000000000'),
      tokenAmount: BigNumber.from('12891478442546858467877'),
      liquidityIncrease: BigNumber.from('12891478442546858467877'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.bob,
      lower: '600',
      upper: '800',
      tokenAmount: BigNumber.from('4901161634764542438934'),
      liquidityAmount: BigNumber.from('4901161634764542438934'),
      fungible: true,
      balance0Increase: BigNumber.from('11786622206938309592'),
      balance1Increase: BigNumber.from('38018615604156121197'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.bob,
      lower: '600',
      upper: '800',
      tokenAmount: BigNumber.from('7990316807782316028943'),
      liquidityAmount: BigNumber.from('7990316807782316028943'),
      fungible: true,
      balance0Increase: BigNumber.from('19215617142486657242'),
      balance1Increase: BigNumber.from('61981384395843878804'),
      revertMessage: '',
    })

    await validateBurn({
      signer: hre.props.alice,
      lower: '500',
      upper: '1000',
      tokenAmount: BigNumber.from('4152939701311089823384'),
      liquidityAmount: BigNumber.from('4152939701311089823384'),
      fungible: true,
      balance0Increase: BigNumber.from('49712675932448838872'),
      balance1Increase: BigNumber.from('53557189146645258776'),
      revertMessage: '',
    })
  })
})