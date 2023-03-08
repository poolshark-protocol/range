import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'

export const Q64x96 = BigNumber.from('2').pow(96)
export const BN_ZERO = BigNumber.from('0')
export interface Position {
  liquidity: BigNumber
  feeGrowthInside0Last: BigNumber
  feeGrowthInside1Last: BigNumber
  amount0: BigNumber
  amount1: BigNumber
}

export interface PoolState {
  unlocked: number
  nearestTick: number
  observationIndex: number
  liquidity: BigNumber
  liquidityGlobal: BigNumber
  price: BigNumber
  secondsGrowthGlobal: BigNumber
  feeGrowthGlobal0: BigNumber
  feeGrowthGlobal1: BigNumber
}

export interface SwapCache {
  cross: boolean
  crossTick: number
  swapFee: number
  protocolFee: number
  input: BigNumber
  output: BigNumber
  amountIn: BigNumber
}

export interface Tick {
  previousTick: number
  nextTick: number
  liquidityDelta: BigNumber
  feeGrowthOutside0: BigNumber
  feeGrowthOutside1: BigNumber
  secondsGrowthOutside: BigNumber
}

export interface ValidateMintParams {
  signer: SignerWithAddress
  recipient: string
  lowerOld: string
  lower: string
  upperOld: string
  upper: string
  amount0: BigNumber
  amount1: BigNumber
  fungible: boolean
  balance0Decrease: BigNumber
  balance1Decrease: BigNumber
  tokenAmount?: BigNumber
  liquidityIncrease: BigNumber
  revertMessage: string
  collectRevertMessage?: string
}

export interface ValidateSwapParams {
  signer: SignerWithAddress
  recipient: string
  zeroForOne: boolean
  amountIn: BigNumber
  sqrtPriceLimitX96: BigNumber
  balanceInDecrease: BigNumber
  balanceOutIncrease: BigNumber
  revertMessage: string
}

export interface ValidateBurnParams {
  signer: SignerWithAddress
  lower: string
  upper: string
  tokenAmount?: BigNumber
  liquidityAmount: BigNumber
  fungible: boolean
  balance0Increase: BigNumber
  balance1Increase: BigNumber
  revertMessage: string
}

export async function validateSwap(params: ValidateSwapParams) {
  const signer = params.signer
  const recipient = params.recipient
  const zeroForOne = params.zeroForOne
  const amountIn = params.amountIn
  const sqrtPriceLimitX96 = params.sqrtPriceLimitX96
  const balanceInDecrease = params.balanceInDecrease
  const balanceOutIncrease = params.balanceOutIncrease
  const revertMessage = params.revertMessage

  let balanceInBefore
  let balanceOutBefore
  if (zeroForOne) {
    balanceInBefore = await hre.props.token0.balanceOf(signer.address)
    balanceOutBefore = await hre.props.token1.balanceOf(signer.address)
    await hre.props.token0.approve(hre.props.rangePool.address, amountIn)
  } else {
    balanceInBefore = await hre.props.token1.balanceOf(signer.address)
    balanceOutBefore = await hre.props.token0.balanceOf(signer.address)
    await hre.props.token1.approve(hre.props.rangePool.address, amountIn)
  }

  const poolBefore: PoolState = await hre.props.rangePool.poolState()
  const liquidityBefore = poolBefore.liquidity
  const priceBefore = poolBefore.price
  const nearestTickBefore = poolBefore.nearestTick

  // quote pre-swap and validate balance changes match post-swap
  const quote = await hre.props.rangePool.quote(zeroForOne, amountIn, sqrtPriceLimitX96)
  const poolState: PoolState = quote[0]
  const swapCache: SwapCache = quote[1]

  if (revertMessage == '') {
    let txn = await hre.props.rangePool
      .connect(signer)
      .swap(signer.address, zeroForOne, amountIn, sqrtPriceLimitX96)
    await txn.wait()
  } else {
    await expect(
      hre.props.rangePool
        .connect(signer)
        .swap(signer.address, zeroForOne, amountIn, sqrtPriceLimitX96)
    ).to.be.revertedWith(revertMessage)
    return
  }

  let balanceInAfter
  let balanceOutAfter
  if (zeroForOne) {
    balanceInAfter = await hre.props.token0.balanceOf(signer.address)
    balanceOutAfter = await hre.props.token1.balanceOf(signer.address)
  } else {
    balanceInAfter = await hre.props.token1.balanceOf(signer.address)
    balanceOutAfter = await hre.props.token0.balanceOf(signer.address)
  }

  expect(balanceInBefore.sub(balanceInAfter)).to.be.equal(balanceInDecrease)
  expect(balanceOutAfter.sub(balanceOutBefore)).to.be.equal(balanceOutIncrease)
  expect(balanceInBefore.sub(balanceInAfter)).to.be.equal(swapCache.input)
  expect(balanceOutAfter.sub(balanceOutBefore)).to.be.equal(swapCache.output)

  const poolAfter: PoolState = await hre.props.rangePool.poolState()
  const liquidityAfter = poolAfter.liquidity
  //TODO: check feeGrowth before and after swap
  const priceAfter = poolAfter.price

  // expect(liquidityAfter).to.be.equal(finalLiquidity);
  // expect(priceAfter).to.be.equal(finalPrice);
}

export async function validateMint(params: ValidateMintParams) {
  const signer = params.signer
  const recipient = params.recipient
  const lowerOld = BigNumber.from(params.lowerOld)
  const lower = BigNumber.from(params.lower)
  const upper = BigNumber.from(params.upper)
  const upperOld = BigNumber.from(params.upperOld)
  const amount0 = params.amount0
  const amount1 = params.amount1
  const fungible = params.fungible
  const balance0Decrease = params.balance0Decrease
  const balance1Decrease = params.balance1Decrease
  const liquidityIncrease = params.liquidityIncrease
  const revertMessage = params.revertMessage
  const collectRevertMessage = params.collectRevertMessage

  //collect first to recreate positions if necessary
  if (!collectRevertMessage) {
    const txn = await hre.props.rangePool
      .connect(params.signer)
      .burn({
        to: signer.address, 
        lower: lower, 
        upper: upper,
        amount: '0',
        fungible: fungible,
        collect: true
      })
    await txn.wait()
  } else {
    await expect(
      hre.props.rangePool.connect(params.signer).burn({
        to: signer.address, 
        lower: lower, 
        upper: upper,
        amount: '0',
        fungible: fungible,
        collect: true
      })
    ).to.be.revertedWith(collectRevertMessage)
  }
  let balance0Before
  let balance1Before
  balance0Before = await hre.props.token0.balanceOf(params.signer.address)
  balance1Before = await hre.props.token1.balanceOf(params.signer.address)
  await hre.props.token0
    .connect(params.signer)
    .approve(hre.props.rangePool.address, amount0)
  await hre.props.token1
    .connect(params.signer)
    .approve(hre.props.rangePool.address, amount1)

  let lowerOldTickBefore: Tick
  let lowerTickBefore: Tick
  let upperOldTickBefore: Tick
  let upperTickBefore: Tick
  let positionBefore: Position
  let positionToken: Contract
  let positionTokenBalanceBefore: BigNumber
  lowerOldTickBefore = await hre.props.rangePool.ticks(lowerOld)
  lowerTickBefore = await hre.props.rangePool.ticks(lower)
  upperOldTickBefore = await hre.props.rangePool.ticks(upperOld)
  upperTickBefore = await hre.props.rangePool.ticks(upper)
  if (fungible) {
    positionBefore = await hre.props.rangePool.positions(
      hre.props.rangePool.address,
      lower,
      upper
    )
    const positionTokenAddress  = await hre.props.rangePool.tokens(lower, upper);
    if (positionTokenAddress != '0x0000000000000000000000000000000000000000'){
      positionToken = await hre.ethers.getContractAt('RangePoolERC20', positionTokenAddress);
      expect(await positionToken.decimals()).to.be.equal(18)
      positionTokenBalanceBefore = await positionToken.balanceOf(signer.address);
    } else {
      positionTokenBalanceBefore = BN_ZERO
    }
  } else {
    positionBefore = await hre.props.rangePool.positions(
      recipient,
      lower,
      upper
    )
  }
  if (revertMessage == '') {
    const txn = await hre.props.rangePool
      .connect(params.signer)
      .mint({
        to: params.signer.address,
        lowerOld: lowerOld, 
        lower: lower,
        upper: upper,
        upperOld: upperOld,
        amount0: amount0,
        amount1: amount1,
        fungible: fungible,
    })
    await txn.wait()
  } else {
    await expect(
      hre.props.rangePool
        .connect(params.signer)
        .mint({
          to: params.signer.address,
          lowerOld: lowerOld, 
          lower: lower,
          upper: upper,
          upperOld: upperOld,
          amount0: amount0,
          amount1: amount1,
          fungible: fungible,
      })
    ).to.be.revertedWith(revertMessage)
    return
  }

  let balance0After
  let balance1After
  balance0After = await hre.props.token0.balanceOf(params.signer.address)
  balance1After = await hre.props.token1.balanceOf(params.signer.address)

  expect(balance0Before.sub(balance0After)).to.be.equal(balance0Decrease)
  expect(balance1Before.sub(balance1After)).to.be.equal(balance1Decrease)

  let lowerOldTickAfter: Tick
  let lowerTickAfter: Tick
  let upperOldTickAfter: Tick
  let upperTickAfter: Tick
  let positionAfter: Position
  let positionTokenBalanceAfter: BigNumber
  lowerOldTickAfter = await hre.props.rangePool.ticks(lowerOld)
  lowerTickAfter = await hre.props.rangePool.ticks(lower)
  upperOldTickAfter = await hre.props.rangePool.ticks(upperOld)
  upperTickAfter = await hre.props.rangePool.ticks(upper)
  if (fungible) {
    positionAfter = await hre.props.rangePool.positions(
      hre.props.rangePool.address,
      lower,
      upper
    )
    const positionTokenAddress  = await hre.props.rangePool.tokens(lower, upper);
    if (positionTokenAddress != '0x0000000000000000000000000000000000000000') {
      positionToken = await hre.ethers.getContractAt('RangePoolERC20', positionTokenAddress);
      expect(await positionToken.decimals()).to.be.equal(18)
      positionTokenBalanceAfter = await positionToken.balanceOf(signer.address);
    } else {
      positionTokenBalanceAfter = BN_ZERO
    }
    positionTokenBalanceAfter = await positionToken.balanceOf(signer.address);
    if (params.tokenAmount)
      expect(positionTokenBalanceAfter.sub(positionTokenBalanceBefore)).to.be.equal(params.tokenAmount)
  } else {
    positionAfter = await hre.props.rangePool.positions(
      params.signer.address,
      lower,
      upper
    )
  }
  expect(lowerTickAfter.liquidityDelta.sub(lowerTickBefore.liquidityDelta)).to.be.equal(
    liquidityIncrease
  )
  expect(upperTickAfter.liquidityDelta.sub(upperTickBefore.liquidityDelta)).to.be.equal(
    BN_ZERO.sub(liquidityIncrease)
  )
  expect(positionAfter.liquidity.sub(positionBefore.liquidity)).to.be.equal(liquidityIncrease)
}

export async function validateBurn(params: ValidateBurnParams) {
  const signer = params.signer
  const lower = BigNumber.from(params.lower)
  const upper = BigNumber.from(params.upper)
  const liquidityAmount = params.liquidityAmount
  const fungible = params.fungible
  const balance0Increase = params.balance0Increase
  const balance1Increase = params.balance1Increase
  const revertMessage = params.revertMessage

  let balance0Before
  let balance1Before
  balance0Before = await hre.props.token0.balanceOf(signer.address)
  balance1Before = await hre.props.token1.balanceOf(signer.address)

  let lowerTickBefore: Tick
  let upperTickBefore: Tick
  let positionBefore: Position
  let positionToken: Contract
  let positionTokenBalanceBefore: BigNumber
  lowerTickBefore = await hre.props.rangePool.ticks(lower)
  upperTickBefore = await hre.props.rangePool.ticks(upper)
  if (fungible) {
    const positionTokenAddress  = await hre.props.rangePool.tokens(lower, upper);
    positionToken = await hre.ethers.getContractAt('RangePoolERC20', positionTokenAddress);
    expect(await positionToken.decimals()).to.be.equal(18)
    positionTokenBalanceBefore = await positionToken.balanceOf(signer.address);
    positionBefore = await hre.props.rangePool.positions(hre.props.rangePool.address, lower, upper)
  } else {
    positionBefore = await hre.props.rangePool.positions(signer.address, lower, upper)
  }
 
  if (revertMessage == '') {
    const burnTxn = await hre.props.rangePool
      .connect(signer)
      .burn({
        to: params.signer.address,
        lower: lower,
        upper: upper,
        amount: params.tokenAmount ? params.tokenAmount : liquidityAmount,
        fungible: fungible,
        collect: true
    })
    await burnTxn.wait()
    //TODO: expect balances to remain unchanged until collect
  } else {
    await expect(
      hre.props.rangePool.connect(signer).burn({
        to: params.signer.address,
        lower: lower,
        upper: upper,
        amount: params.tokenAmount ? params.tokenAmount : liquidityAmount,
        fungible: fungible,
        collect: true
    })
    ).to.be.revertedWith(revertMessage)
    return
  }

  let balance0After
  let balance1After
  balance0After = await hre.props.token0.balanceOf(signer.address)
  balance1After = await hre.props.token1.balanceOf(signer.address)

  expect(balance0After.sub(balance0Before)).to.be. equal(balance0Increase)
  expect(balance1After.sub(balance1Before)).to.be.equal(balance1Increase)

  let lowerTickAfter: Tick
  let upperTickAfter: Tick
  let positionAfter: Position
  let positionTokenBalanceAfter: BigNumber
  lowerTickAfter = await hre.props.rangePool.ticks(lower)
  upperTickAfter = await hre.props.rangePool.ticks(upper)
  if (fungible) {
    positionTokenBalanceAfter = await positionToken.balanceOf(signer.address);
    positionAfter = await hre.props.rangePool.positions(hre.props.rangePool.address, lower, upper)
    if (params.tokenAmount)
      expect(positionTokenBalanceAfter.sub(positionTokenBalanceBefore)).to.be.equal(BN_ZERO.sub(params.tokenAmount))
  } else {
    positionAfter = await hre.props.rangePool.positions(signer.address, lower, upper)
  }
  expect(lowerTickAfter.liquidityDelta.sub(lowerTickBefore.liquidityDelta)).to.be.equal(
    BN_ZERO.sub(liquidityAmount)
  )
  expect(upperTickAfter.liquidityDelta.sub(upperTickBefore.liquidityDelta)).to.be.equal(
    liquidityAmount
  )
  expect(positionAfter.liquidity.sub(positionBefore.liquidity)).to.be.equal(BN_ZERO.sub(liquidityAmount))
}