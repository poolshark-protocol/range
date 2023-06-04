import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { IRangePool } from '../../../typechain'
import { PoolState, BN_ZERO, validateMint, validateSwap, getSample, validateSample, validateBurn } from '../../utils/contracts/rangepool'
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

  it('Should get accurate accumulator values', async function () {
    await validateMint({
        signer: hre.props.alice,
        recipient: hre.props.alice.address,
        lower: '10000',
        upper: '20000',
        amount0: tokenAmount,
        amount1: tokenAmount,
        balance0Decrease: BigNumber.from('100000000000000000000'),
        balance1Decrease: BigNumber.from('0'),
        tokenAmount: BigNumber.from('170245243948753558591'),
        liquidityIncrease: BigNumber.from('170245243948753558591'),
        revertMessage: '',
        collectRevertMessage: ''
      })
  
      await validateSwap({
        signer: hre.props.alice,
        recipient: hre.props.alice.address,
        zeroForOne: false,
        amountIn: tokenAmount,
        sqrtPriceLimitX96: maxPrice,
        balanceInDecrease: BigNumber.from('82071478085223566135'),
        balanceOutIncrease: BigNumber.from('13496379535787307859'),
        revertMessage: '',
      })

      await validateSample({
        tickSecondsAccum: '1903300',
        secondsPerLiquidityAccum: '2722258935367507707710994414499188461813',
        averagePrice: '1461300573427867316570072651998408279850435624081',
        averageLiquidity: '7995110090085540330',
        averageTick: 887270
      })

      await validateBurn({
        signer: hre.props.alice,
        lower: '10000',
        upper: '20000',
        tokenAmount: BigNumber.from('170245243948753558591'),
        liquidityAmount: BigNumber.from('170245243948753558591'),
        balance0Increase: BigNumber.from('6751565550668988'),
        balance1Increase: BigNumber.from('182071478085223566134'),
        revertMessage: '',
      })
  })
})
