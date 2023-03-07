/* global describe it before ethers */
const hardhat = require('hardhat')
const { expect } = require('chai')
import { gBefore } from '../utils/hooks.test'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'

alice: SignerWithAddress
describe('RangePoolFactory Tests', function () {
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

  it('Should not create pool with identical token address', async function () {
    await expect(
      hre.props.rangePoolFactory
        .connect(hre.props.admin)
        .createRangePool(
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
          '500',
          '177159557114295710296101716160'
        )
    ).to.be.revertedWith('IdenticalTokenAddresses()')
  })

  it('Should not create pool if the pair already exists', async function () {
    await expect(
      hre.props.rangePoolFactory
        .connect(hre.props.admin)
        .createRangePool(hre.props.token1.address, hre.props.token0.address, '500', '177159557114295710296101716160')
    ).to.be.revertedWith('PoolAlreadyExists()')
  })

  it('Should not create pool for a fee tier not supported', async function () {
    await expect(
      hre.props.rangePoolFactory
        .connect(hre.props.admin)
        .createRangePool(hre.props.token1.address, hre.props.token0.address, '1000', '177159557114295710296101716160')
    ).to.be.revertedWith('FeeTierNotSupported()')
  })

  it('Should not create pool if token0 has no decimals', async function () {
    await hre.props.token0.connect(hre.props.admin).setDecimals(0)
    await expect(
      hre.props.rangePoolFactory
        .connect(hre.props.admin)
        .createRangePool(hre.props.token1.address, hre.props.token0.address, '1000', '177159557114295710296101716160')
    ).to.be.revertedWith('InvalidTokenDecimals()')
    await hre.props.token0.connect(hre.props.admin).setDecimals(18)
  })

  it('Should not create pool if token1 has no decimals', async function () {
    await hre.props.token1.connect(hre.props.admin).setDecimals(0)
    await expect(
      hre.props.rangePoolFactory
        .connect(hre.props.admin)
        .createRangePool(hre.props.token1.address, hre.props.token0.address, '1000', '177159557114295710296101716160')
    ).to.be.revertedWith('InvalidTokenDecimals()')
    await hre.props.token1.connect(hre.props.admin).setDecimals(18)
  })

  it('Should get valid owner', async function () {
    expect(await
      hre.props.rangePoolFactory
        .owner()
    ).to.be.equal(hre.props.rangePoolAdmin.address)
  })
})
