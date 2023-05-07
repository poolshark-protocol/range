import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { IRangePool } from '../../../typechain'
import { PoolState, BN_ZERO } from '../../utils/contracts/rangepool'
import { gBefore } from '../../utils/hooks.test'
import { mintSigners20 } from '../../utils/token'

describe('PrecisionMath Library Tests', function () {
  let token0Amount: BigNumber
  let token1Amount: BigNumber
  let token0Decimals: number
  let token1Decimals: number
  let currentPrice: BigNumber

  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress



  before(async function () {
    await gBefore()
    let currentBlock = await ethers.provider.getBlockNumber()

    const pool: PoolState = await hre.props.rangePool.poolState()
    const liquidity = pool.liquidity
    const price = pool.price

    expect(liquidity).to.be.equal(BN_ZERO)

    // console.log("sqrt price:", await (await hre.props.rangePool.sqrtPrice()).toString());
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

  it('divRoundingUp - Should round up', async function () {
    expect(
      await hre.props.precisionMathLib.divRoundingUp(BigNumber.from('5'), BigNumber.from('4'))
    ).to.be.equal(BigNumber.from('2'))
  })

  it('divRoundingUp - Should revert on uint256 max', async function () {
    await expect(
      hre.props.precisionMathLib.mulDivRoundingUp(
        BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
        BigNumber.from('2'),
        BigNumber.from('1')
      )
    ).to.be.revertedWith('Transaction reverted: library was called directly')
  })

  it('divRoundingUp - Should handle rounding up', async function () {
    expect(
      await hre.props.precisionMathLib.mulDivRoundingUp(
        ethers.utils.parseUnits('2', 70),
        BigNumber.from('1'),
        BigNumber.from('3')
      )
    ).to.be.equal(
      BigNumber.from('6666666666666666666666666666666666666666666666666666666666666666666667')
    )
  })
})
