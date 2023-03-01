import { GetBeforeEach } from './setup/beforeEachProps'


const gbe = new GetBeforeEach()

before(async function () {
  hre.isAllTestSuite = true
  await gBefore()
})

export async function gBefore() {
  await gbe.getBeforeEach()
}
