import { handleMintFungible as handleMintFungibleHelper } from './rangepool/mint'
import { handleBurnFungible as handleBurnFungibleHelper } from './rangepool/burn'
import { handleSwap as handleSwapHelper } from './rangepool/swap'
import { handleTransferSingle as handleTransferSingleHelper } from './rangepoolerc1155'
import { handleCompound as handleCompoundHelper } from './rangepool/compound'
import { Mint, Burn, Swap, Compound, BurnFungible, MintFungible} from '../../generated/RangePoolFactory/RangePool'
import { TransferSingle } from '../../generated/templates/RangePoolTemplate/RangePool'

export function handleMintFungible(event: MintFungible): void {
  handleMintFungibleHelper(event)
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

export function handleTransferSingle(event: TransferSingle): void {
  handleTransferSingleHelper(event)
}