import { ethers } from 'hardhat'

export async function gasUsed(): Promise<string> {
  const blockNumber = await ethers.provider.getBlockNumber()
  const block = await ethers.provider.getBlock(blockNumber)
  return block.gasUsed.toString()
}
