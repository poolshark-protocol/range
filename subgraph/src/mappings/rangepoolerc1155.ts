import { Address } from '@graphprotocol/graph-ts'
import { TransferBatch, TransferSingle } from '../../generated/templates/RangePoolTemplate/RangePoolERC1155'
import { safeLoadPositionFraction, safeLoadPositionToken } from './utils/loads'

export function handleTransferSingle(event: TransferSingle): void {
    // let poolAddress = event.address.toHex()
    // let senderParam = event.params.sender
    // let fromParam = event.params.from
    // let toParam = event.params.to
    // let tokenIdParam = event.params.id
    // let amountParam = event.params.amount

    // let loadPositionFractionFrom = safeLoadPositionFraction(
    //     poolAddress,
    //     tokenIdParam,
    //     Address.fromString(fromParam.toHex())
    // )
    // let loadPositionToken = safeLoadPositionToken(
    //     poolAddress,
    //     tokenIdParam
    // )

    // let positionFractionFrom = loadPositionFractionFrom.entity
    // let positionFractionTo = loadPositionFractionTo.entity
    // let loadPosition = safeLoadPositionById(positionToken.position)
    // let position = loadPosition.entity

    // if (positionFraction.amount.equals(tokenBurnedParam)) {
    //     let positionTokenFractions = positionToken.fractions
    //     let fractionIndex = positionTokenFractions.indexOf(positionFraction.id)
    //     positionTokenFractions.splice(fractionIndex, 1)
    //     positionToken.fractions = positionTokenFractions
    //     store.remove('PositionFraction', poolAddress.concat(tokenIdParam.toHex()).concat(msgSender))
    // } else {
    //     positionFraction.amount = positionFraction.amount.minus(tokenBurnedParam)
    //     positionFraction.updatedAtBlockNumber = event.block.number
    //     positionFraction.updatedAtTimestamp = event.block.timestamp
    //     positionFraction.save()
    // }
}

export function handleTransferBatch(event: TransferBatch): void {

}