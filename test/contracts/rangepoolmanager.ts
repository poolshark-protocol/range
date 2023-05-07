/* global describe it before ethers */
const hardhat = require('hardhat')
const { expect } = require('chai')
import { gBefore } from '../utils/hooks.test'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { BN_ZERO } from '../utils/contracts/rangepool'

alice: SignerWithAddress
describe('RangePoolAdmin Tests', function () {
  let token0Amount: BigNumber
  let token1Amount: BigNumber
  let token0Decimals: number
  let token1Decimals: number
  let currentPrice: BigNumber

  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress

  const liquidityAmount = BigNumber.from('99855108194609381495771')
  const minTickIdx = BigNumber.from('-887272')
  const maxTickIdx = BigNumber.from('887272')



  before(async function () {
    await gBefore()
  })

  this.beforeEach(async function () {})

  it('Should be able to change owner', async function () {
    // check pool contract owner
    expect(await
        hre.props.rangePool
          .owner()
      ).to.be.equal(hre.props.rangePoolManager.address)

    // check admin contract owner
    expect(await
      hre.props.rangePoolManager
        .owner()
    ).to.be.equal(hre.props.admin.address)

    // expect revert if non-owner calls admin function
    await expect(
        hre.props.rangePoolManager
          .connect(hre.props.bob)
          .transferOwner(hre.props.bob.address)
    ).to.be.revertedWith('OwnerOnly()')

    // transfer ownership to bob
    await hre.props.rangePoolManager.connect(hre.props.admin).transferOwner(hre.props.bob.address)
    
    // expect bob to be the new admin
    expect(await
        hre.props.rangePoolManager
          .owner()
      ).to.be.equal(hre.props.bob.address)
    
    await expect(
        hre.props.rangePoolManager
          .connect(hre.props.admin)
          .transferOwner(hre.props.bob.address)
    ).to.be.revertedWith('OwnerOnly()')

    // transfer ownership back to previous admin
    await hre.props.rangePoolManager.connect(hre.props.bob).transferOwner(hre.props.admin.address)
    
    // check admin is owner again
    expect(await
        hre.props.rangePoolManager
        .owner()
    ).to.be.equal(hre.props.admin.address)
  })

  it('Should be able to change feeTo', async function () {
    // check admin contract feeTo
    expect(await
      hre.props.rangePoolManager
        .feeTo()
    ).to.be.equal(hre.props.admin.address)

    // owner should not be able to claim fees
    await hre.props.rangePoolManager.connect(hre.props.admin).transferOwner(hre.props.bob.address)

    // expect revert if non-owner calls admin function
    await expect(
        hre.props.rangePoolManager
          .connect(hre.props.bob)
          .transferFeeTo(hre.props.bob.address)
    ).to.be.revertedWith('FeeToOnly()')

    await hre.props.rangePoolManager.connect(hre.props.bob).transferOwner(hre.props.admin.address)

    // transfer ownership to bob
    await hre.props.rangePoolManager.connect(hre.props.admin).transferFeeTo(hre.props.bob.address)
    
    // expect bob to be the new admin
    expect(await
        hre.props.rangePoolManager
          .feeTo()
      ).to.be.equal(hre.props.bob.address)
    
    await expect(
        hre.props.rangePoolManager
          .connect(hre.props.admin)
          .transferFeeTo(hre.props.bob.address)
    ).to.be.revertedWith('FeeToOnly()')

    // transfer ownership back to previous admin
    await hre.props.rangePoolManager.connect(hre.props.bob).transferFeeTo(hre.props.admin.address)
    
    // check admin is owner again
    expect(await
        hre.props.rangePoolManager
        .feeTo()
    ).to.be.equal(hre.props.admin.address)
  })

  it('Should set protocol fees on top pools', async function () {
    // check initial protocol fees
    expect(await
      hre.props.rangePoolManager
        .protocolFees(hre.props.rangePool.address)
    ).to.be.equal(BN_ZERO)

    // should revert when non-admin calls
    await expect(
        hre.props.rangePoolManager
          .connect(hre.props.bob)
          .setTopPools([], [hre.props.rangePool.address], "500")
    ).to.be.revertedWith('OwnerOnly()')

    // set protocol fees on top pools
    await hre.props.rangePoolManager.connect(hre.props.admin).setTopPools([], [hre.props.rangePool.address], "500")
    // check new fee set
    expect((await
        hre.props.rangePool.poolState())
          .protocolFee
      ).to.be.equal(500)
    await hre.props.rangePoolManager.connect(hre.props.admin).transferOwner(hre.props.bob.address)

    // remove protocol fees on top pools
    await hre.props.rangePoolManager.connect(hre.props.bob).setTopPools([hre.props.rangePool.address], [], "500")

    // check new fee set
    expect((await
      hre.props.rangePool.poolState())
        .protocolFee
    ).to.be.equal(0)

    // should revert when non-admin calls
    await expect(
        hre.props.rangePoolManager
            .connect(hre.props.admin)
            .setTopPools([], [hre.props.rangePool.address], "500")
    ).to.be.revertedWith('OwnerOnly()')
  
    await hre.props.rangePoolManager.connect(hre.props.bob).transferOwner(hre.props.admin.address)
  })

  it('Should set collect fees on top pools', async function () {
    // check initial protocol fees
    expect(await
      hre.props.rangePoolManager
        .protocolFees(hre.props.rangePool.address)
    ).to.be.equal(BN_ZERO)

    // should revert when non-admin calls
    await expect(
        hre.props.rangePoolManager
          .connect(hre.props.bob)
          .collectTopPools([hre.props.rangePool.address])
    ).to.be.revertedWith('FeeToOnly()')

    // set protocol fees on top pools
    await hre.props.rangePoolManager.connect(hre.props.admin).collectTopPools([hre.props.rangePool.address])
  })

  it('Should set factory', async function () {
    // check initial protocol fees
    expect(await
      hre.props.rangePoolManager
        .factory()
    ).to.be.equal(hre.props.rangePoolFactory.address)

    // should revert when non-admin calls
    await expect(
        hre.props.rangePoolManager
          .connect(hre.props.bob)
          .setFactory(hre.props.bob.address)
    ).to.be.revertedWith('OwnerOnly()')

    await hre.props.rangePoolManager.connect(hre.props.admin).setFactory(hre.props.bob.address)

    expect(await
      hre.props.rangePoolManager
        .factory()
    ).to.be.equal(hre.props.bob.address)

    await hre.props.rangePoolManager.connect(hre.props.admin).setFactory(hre.props.rangePoolFactory.address)

    expect(await
      hre.props.rangePoolManager
        .factory()
    ).to.be.equal(hre.props.rangePoolFactory.address)
  })

  it('Should enable fee tier', async function () {
    // check initial protocol fees
    await expect(
      hre.props.rangePoolManager
        .connect(hre.props.bob)
        .enableFeeTier("100", "20")
    ).to.be.revertedWith('OwnerOnly()')

    await expect(
      hre.props.rangePoolManager
        .connect(hre.props.admin)
        .enableFeeTier("500", "20")
    ).to.be.revertedWith('FeeTierAlreadyEnabled()')

    // should revert when non-admin calls
    expect(await
      hre.props.rangePoolManager
        .feeTiers("100")
    ).to.be.equal(BN_ZERO)

    await hre.props.rangePoolManager
        .connect(hre.props.admin)
        .enableFeeTier("100", "5")

    expect(await
      hre.props.rangePoolManager
        .connect(hre.props.admin)
        .feeTiers(100)
    ).to.be.equal(5)
  })
})
