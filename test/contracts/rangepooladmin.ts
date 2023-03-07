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

  //TODO: mint position and burn as if there were 100

  before(async function () {
    await gBefore()
  })

  this.beforeEach(async function () {})

  it('Should be able to change owner', async function () {
    // check pool contract owner
    expect(await
        hre.props.rangePool
          .owner()
      ).to.be.equal(hre.props.rangePoolAdmin.address)

    // check admin contract owner
    expect(await
      hre.props.rangePoolAdmin
        .owner()
    ).to.be.equal(hre.props.admin.address)

    // expect revert if non-owner calls admin function
    await expect(
        hre.props.rangePoolAdmin
          .connect(hre.props.bob)
          .transferOwner(hre.props.bob.address)
    ).to.be.revertedWith('OwnerOnly()')

    // transfer ownership to bob
    await hre.props.rangePoolAdmin.connect(hre.props.admin).transferOwner(hre.props.bob.address)
    
    // expect bob to be the new admin
    expect(await
        hre.props.rangePoolAdmin
          .owner()
      ).to.be.equal(hre.props.bob.address)
    
    await expect(
        hre.props.rangePoolAdmin
          .connect(hre.props.admin)
          .transferOwner(hre.props.bob.address)
    ).to.be.revertedWith('OwnerOnly()')

    // transfer ownership back to previous admin
    await hre.props.rangePoolAdmin.connect(hre.props.bob).transferOwner(hre.props.admin.address)
    
    // check admin is owner again
    expect(await
        hre.props.rangePoolAdmin
        .owner()
    ).to.be.equal(hre.props.admin.address)
  })

  it('Should be able to change feeTo', async function () {
    // check admin contract feeTo
    expect(await
      hre.props.rangePoolAdmin
        .feeTo()
    ).to.be.equal(hre.props.admin.address)

    // owner should not be able to claim fees
    await hre.props.rangePoolAdmin.connect(hre.props.admin).transferOwner(hre.props.bob.address)

    // expect revert if non-owner calls admin function
    await expect(
        hre.props.rangePoolAdmin
          .connect(hre.props.bob)
          .transferFeeTo(hre.props.bob.address)
    ).to.be.revertedWith('FeeToOnly()')

    await hre.props.rangePoolAdmin.connect(hre.props.bob).transferOwner(hre.props.admin.address)

    // transfer ownership to bob
    await hre.props.rangePoolAdmin.connect(hre.props.admin).transferFeeTo(hre.props.bob.address)
    
    // expect bob to be the new admin
    expect(await
        hre.props.rangePoolAdmin
          .feeTo()
      ).to.be.equal(hre.props.bob.address)
    
    await expect(
        hre.props.rangePoolAdmin
          .connect(hre.props.admin)
          .transferFeeTo(hre.props.bob.address)
    ).to.be.revertedWith('FeeToOnly()')

    // transfer ownership back to previous admin
    await hre.props.rangePoolAdmin.connect(hre.props.bob).transferFeeTo(hre.props.admin.address)
    
    // check admin is owner again
    expect(await
        hre.props.rangePoolAdmin
        .feeTo()
    ).to.be.equal(hre.props.admin.address)
  })

  it('Should set protocol fees on top pools', async function () {
    // check initial protocol fees
    expect(await
      hre.props.rangePoolAdmin
        .protocolFees(hre.props.rangePool.address)
    ).to.be.equal(BN_ZERO)

    // should revert when non-admin calls
    await expect(
        hre.props.rangePoolAdmin
          .connect(hre.props.bob)
          .setTopPools([], [hre.props.rangePool.address], "500")
    ).to.be.revertedWith('OwnerOnly()')

    // set protocol fees on top pools
    await hre.props.rangePoolAdmin.connect(hre.props.admin).setTopPools([], [hre.props.rangePool.address], "500")
    // check new fee set
    expect(await
        hre.props.rangePoolAdmin
          .protocolFees(hre.props.rangePool.address)
      ).to.be.equal(500)
    
    await hre.props.rangePoolAdmin.connect(hre.props.admin).transferOwner(hre.props.bob.address)

    // remove protocol fees on top pools
    await hre.props.rangePoolAdmin.connect(hre.props.bob).setTopPools([hre.props.rangePool.address], [], "500")

    // check new fee set
    expect(await
        hre.props.rangePoolAdmin
            .protocolFees(hre.props.rangePool.address)
        ).to.be.equal(0)

    // should revert when non-admin calls
    await expect(
        hre.props.rangePoolAdmin
            .connect(hre.props.admin)
            .setTopPools([], [hre.props.rangePool.address], "500")
    ).to.be.revertedWith('OwnerOnly()')
  
    await hre.props.rangePoolAdmin.connect(hre.props.bob).transferOwner(hre.props.admin.address)
  })

  it('Should set collect fees on top pools', async function () {
    // check initial protocol fees
    expect(await
      hre.props.rangePoolAdmin
        .protocolFees(hre.props.rangePool.address)
    ).to.be.equal(BN_ZERO)

    // should revert when non-admin calls
    await expect(
        hre.props.rangePoolAdmin
          .connect(hre.props.bob)
          .collectTopPools([hre.props.rangePool.address])
    ).to.be.revertedWith('FeeToOnly()')

    // set protocol fees on top pools
    await hre.props.rangePoolAdmin.connect(hre.props.admin).collectTopPools([hre.props.rangePool.address])
  })
})
