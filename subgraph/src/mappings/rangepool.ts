import { handleMint as handleMintHelper, handleMintFungible as handleMintFungibleHelper } from './rangepool/mint'
import { handleBurn as handleBurnHelper, handleBurnFungible as handleBurnFungibleHelper } from './rangepool/burn'
import { handleSwap as handleSwapHelper } from './rangepool/swap'
import { handleCompound as handleCompoundHelper } from './rangepool/compound'
import { Mint, Burn, Swap, Compound, BurnFungible, MintFungible} from '../../generated/RangePoolFactory/RangePool'

export function handleMint(event: Mint): void {
  handleMintHelper(event)
}

export function handleMintFungible(event: MintFungible): void {
  handleMintFungibleHelper(event)
}

export function handleBurn(event: Burn): void {
  handleBurnHelper(event)
}

export function handleBurnFungible(event: BurnFungible): void {
  handleBurnFungibleHelper(event)
}

export function handleCompound(event: Compound): void {
    handleCompoundHelper(event)
}

export function handleSwap(event: Swap): void {
  handleSwapHelper(event)
}