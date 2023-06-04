import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber, Contract } from 'ethers'

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
  protocolFee: number
  tickAtPrice: number
  tickSecondsAccum: BigNumber
  secondsPerLiquidityAccum: BigNumber
  price: BigNumber
  liquidity: BigNumber
  liquidityGlobal: BigNumber
  feeGrowthGlobal0: BigNumber
  feeGrowthGlobal1: BigNumber
  samples: SampleState
  protocolFees: ProtocolFees
}

export interface SampleState {
  index: number
  length: number
  lengthNext: number
}

export interface ProtocolFees {
  token0: BigNumber
  token1: BigNumber
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
  liquidityDelta: BigNumber
  feeGrowthOutside0: BigNumber
  feeGrowthOutside1: BigNumber
  tickSecondsAccumOutside: BigNumber
  secondsPerLiquidityAccumOutside: BigNumber
}

export interface ValidateMintParams {
  signer: SignerWithAddress
  recipient: string
  lower: string
  upper: string
  amount0: BigNumber
  amount1: BigNumber
  balance0Decrease: BigNumber
  balance1Decrease: BigNumber
  tokenAmount?: BigNumber
  liquidityIncrease: BigNumber
  revertMessage: string
  collectRevertMessage?: string
  balanceCheck?: boolean
}

export interface ValidateSampleParams {
  secondsPerLiquidityAccum: string
  tickSecondsAccum: string
  averagePrice: string
  averageLiquidity: string
  averageTick: number
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
  balance0Increase: BigNumber
  balance1Increase: BigNumber
  revertMessage: string
}

export async function getTickAtPrice() {
  const tickAtPrice = (await hre.props.rangePool.poolState()).tickAtPrice
  console.log('tick at price:', tickAtPrice)
}

export async function getRangeBalanceOf(owner: string, lower: number, upper: number): Promise<BigNumber> {
  const positionTokenId  = await hre.props.positionsLib.id(lower, upper);
  const balance = await hre.props.rangePool.balanceOf(owner, positionTokenId)
  console.log('position token balance')
  console.log('----------------------')
  console.log('owner:', owner)
  console.log('balance:', balance.toString())
  return balance
}

export async function getSnapshot(owner: string, lower: number, upper: number) {
  const snapshot = await hre.props.rangePool.snapshot({
    owner: owner,
    lower: lower,
    upper: upper
  })
  console.log('snapshot for ', owner, lower, upper, ':')
  console.log('feesOwed0:', snapshot.feesOwed0.toString())
  console.log('feesOwed1:', snapshot.feesOwed1.toString())
  console.log()
}

export async function getSample(print = false) {
  const sample = await hre.props.rangePool.sample([0])
  if(print) {
    console.log('sample for [0]:')
    console.log('average liquidity:', sample.averageLiquidity.toString())
    console.log('average price:', sample.averagePrice.toString())
    console.log('average tick:', sample.averageTick.toString())
  }
  return sample
}

export async function validateSample(params: ValidateSampleParams) {
  const secondsPerLiquidityAccum = params.secondsPerLiquidityAccum
  const tickSecondsAccum = BigNumber.from(params.tickSecondsAccum)
  const averagePrice = BigNumber.from(params.averagePrice)
  const averageTick = BigNumber.from(params.averageTick)
  const averageLiquidity = BigNumber.from(params.averageLiquidity)

  const sample = await getSample()

  expect(sample.secondsPerLiquidityAccum[0]).to.be.equal(secondsPerLiquidityAccum)
  expect(sample.tickSecondsAccum[0]).to.be.equal(tickSecondsAccum)
  expect(sample.averagePrice).to.be.equal(averagePrice)
  expect(sample.averageTick).to.be.equal(averageTick)
  expect(sample.averageLiquidity).to.be.equal(averageLiquidity)
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
  const nearestTickBefore = poolBefore.tickAtPrice

  // quote pre-swap and validate balance changes match post-swap
  const quote = await hre.props.rangePool.quote({
    zeroForOne: zeroForOne,
    amountIn: amountIn,
    priceLimit: sqrtPriceLimitX96
  })
  const inAmount = quote[0]
  const outAmount = quote[1]
  const priceAfterQuote = quote[2]

  if (revertMessage == '') {
    let txn = await hre.props.rangePool
      .connect(signer)
      .swap({
        to: signer.address,
        refundTo: signer.address,
        zeroForOne: zeroForOne,
        amountIn: amountIn,
        priceLimit: sqrtPriceLimitX96
      })
    await txn.wait()
  } else {
    await expect(
      hre.props.rangePool
        .connect(signer)
        .swap({
          to: signer.address,
          refundTo: signer.address,
          zeroForOne: zeroForOne,
          amountIn: amountIn,
          priceLimit: sqrtPriceLimitX96
        })
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
  expect(balanceInBefore.sub(balanceInAfter)).to.be.equal(inAmount)
  expect(balanceOutAfter.sub(balanceOutBefore)).to.be.equal(outAmount)

  const poolAfter: PoolState = await hre.props.rangePool.poolState()
  const liquidityAfter = poolAfter.liquidity
  const priceAfter = poolAfter.price

  expect(priceAfter).to.be.equal(priceAfterQuote)
  // check feeGrowth before and after swap

  // expect(liquidityAfter).to.be.equal(finalLiquidity);
  // expect(priceAfter).to.be.equal(finalPrice);
}

export async function validateMint(params: ValidateMintParams) {
  const signer = params.signer
  const recipient = params.recipient
  const lower = BigNumber.from(params.lower)
  const upper = BigNumber.from(params.upper)
  const amount0 = params.amount0
  const amount1 = params.amount1
  const balance0Decrease = params.balance0Decrease
  const balance1Decrease = params.balance1Decrease
  const liquidityIncrease = params.liquidityIncrease
  const revertMessage = params.revertMessage
  const collectRevertMessage = params.collectRevertMessage
  const balanceCheck = params.balanceCheck ? true : params.balanceCheck

  //collect first to recreate positions if necessary
  if (!collectRevertMessage) {
    const txn = await hre.props.rangePool
      .connect(params.signer)
      .burn({
        to: signer.address, 
        lower: lower, 
        upper: upper,
        amount: '0',
      })
    await txn.wait()
  } else {
    await expect(
      hre.props.rangePool.connect(params.signer).burn({
        to: signer.address, 
        lower: lower, 
        upper: upper,
        amount: '0',
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

  let lowerTickBefore: Tick
  let upperTickBefore: Tick
  let positionBefore: Position
  let positionTokens: Contract
  let positionTokenId: BigNumber
  let positionTokenBalanceBefore: BigNumber
  lowerTickBefore = await hre.props.rangePool.ticks(lower)
  upperTickBefore = await hre.props.rangePool.ticks(upper)

  positionBefore = await hre.props.rangePool.positions(
    lower,
    upper
  )
  positionTokenId  = await hre.props.positionsLib.id(lower, upper);
  positionTokens = await hre.ethers.getContractAt('RangePoolERC1155', hre.props.rangePool.address);
  positionTokenBalanceBefore = await positionTokens.balanceOf(signer.address, positionTokenId);

  if (revertMessage == '') {
    const txn = await hre.props.rangePool
      .connect(params.signer)
      .mint({
        to: recipient,
        lower: lower,
        upper: upper,
        amount0: amount0,
        amount1: amount1,
      })
    await txn.wait()
  } else {
    await expect(
      hre.props.rangePool
        .connect(params.signer)
        .mint({
          to: recipient,
          lower: lower,
          upper: upper,
          amount0: amount0,
          amount1: amount1,
      })
    ).to.be.revertedWith(revertMessage)
    return
  }

  let balance0After
  let balance1After
  balance0After = await hre.props.token0.balanceOf(params.signer.address)
  balance1After = await hre.props.token1.balanceOf(params.signer.address)

  if (balanceCheck) {
    expect(balance0Before.sub(balance0After)).to.be.equal(balance0Decrease)
    expect(balance1Before.sub(balance1After)).to.be.equal(balance1Decrease)
  }


  let lowerTickAfter: Tick
  let upperTickAfter: Tick
  let positionAfter: Position
  let positionTokenBalanceAfter: BigNumber
  lowerTickAfter = await hre.props.rangePool.ticks(lower)
  upperTickAfter = await hre.props.rangePool.ticks(upper)

  positionAfter = await hre.props.rangePool.positions(
    lower,
    upper
  )
  positionTokens = await hre.ethers.getContractAt('RangePoolERC1155', hre.props.rangePool.address);
  positionTokenBalanceAfter = await positionTokens.balanceOf(signer.address, positionTokenId);
  if (params.tokenAmount)
    expect(positionTokenBalanceAfter.sub(positionTokenBalanceBefore)).to.be.equal(params.tokenAmount)
  
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
  let positionTokenId: BigNumber
  let positionTokenBalanceBefore: BigNumber
  lowerTickBefore = await hre.props.rangePool.ticks(lower)
  upperTickBefore = await hre.props.rangePool.ticks(upper)
  // check position token balance
  positionTokenId  = await hre.props.positionsLib.id(lower, upper);
  positionToken = await hre.ethers.getContractAt('RangePoolERC1155', hre.props.rangePool.address);
  positionTokenBalanceBefore = await positionToken.balanceOf(signer.address, positionTokenId);
  positionBefore = await hre.props.rangePool.positions(lower, upper)

  if (revertMessage == '') {
    const burnTxn = await hre.props.rangePool
      .connect(signer)
      .burn({
        to: params.signer.address,
        lower: lower,
        upper: upper,
        amount: params.tokenAmount ? params.tokenAmount : liquidityAmount,
    })
    await burnTxn.wait()
  } else {
    await expect(
      hre.props.rangePool.connect(signer).burn({
        to: params.signer.address,
        lower: lower,
        upper: upper,
        amount: params.tokenAmount ? params.tokenAmount : liquidityAmount,
    })
    ).to.be.revertedWith(revertMessage)
    return
  }

  let balance0After
  let balance1After
  balance0After = await hre.props.token0.balanceOf(signer.address)
  balance1After = await hre.props.token1.balanceOf(signer.address)

  expect(balance0After.sub(balance0Before)).to.be.equal(balance0Increase)
  expect(balance1After.sub(balance1Before)).to.be.equal(balance1Increase)

  let lowerTickAfter: Tick
  let upperTickAfter: Tick
  let positionAfter: Position
  let positionTokenBalanceAfter: BigNumber
  lowerTickAfter = await hre.props.rangePool.ticks(lower)
  upperTickAfter = await hre.props.rangePool.ticks(upper)
  // check position token balance after
  positionTokenBalanceAfter = await positionToken.balanceOf(signer.address, positionTokenId);
  positionAfter = await hre.props.rangePool.positions(lower, upper)
  if (params.tokenAmount)
    expect(positionTokenBalanceAfter.sub(positionTokenBalanceBefore)).to.be.equal(BN_ZERO.sub(params.tokenAmount))
  expect(lowerTickAfter.liquidityDelta.sub(lowerTickBefore.liquidityDelta)).to.be.equal(
    BN_ZERO.sub(liquidityAmount)
  )
  expect(upperTickAfter.liquidityDelta.sub(upperTickBefore.liquidityDelta)).to.be.equal(
    liquidityAmount
  )
  expect(positionAfter.liquidity.sub(positionBefore.liquidity)).to.be.equal(BN_ZERO.sub(liquidityAmount))
}