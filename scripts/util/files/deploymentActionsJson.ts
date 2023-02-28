import { redLog } from '../../constants/colorLog'
import { DeployConstants } from '../../constants/deployConstants'
import { FileIOClient } from '../clients/fileIOClient'

export class DeploymentActionsJson {
  private fileIO: FileIOClient

  constructor() {
    this.fileIO = new FileIOClient()
  }

  public prepareDeploymentActionsJsonFile() {
    const functionName = 'prepareDeploymentActionsFile'

    const blank = this.fileIO.readFile(DeployConstants.JSON_BLANK_FILENAME, functionName)

    this.fileIO.overwriteFile(DeployConstants.DEPLOYMENT_ACTIONS_JSON_FILENAME, blank, functionName)
  }

  public writeDeploymentActionsJsonFile(targetNetwork: string, step: string) {
    const functionName = 'writeDeploymentActionsFile'

    console.log(`📄 Writing ${targetNetwork}:${step} to deployment actions file.`)

    const spacesPerTab = 4

    let deploymentActionsJson = this.fileIO.readFile(
      DeployConstants.DEPLOYMENT_ACTIONS_JSON_FILENAME,
      functionName
    )

    let deploymentActions

    try {
      deploymentActions = JSON.parse(deploymentActionsJson)
    } catch (error: any) {
      redLog(`
                ⛔️ ${functionName}():
                Failed to parse JSON for ${targetNetwork}:${step}
            `)
      throw error
    }

    if (!deploymentActions[targetNetwork]) {
      console.log('\n📄 Creating new entry for %s network.\n', targetNetwork)
      deploymentActions[targetNetwork] = {}
    }

    if (!deploymentActions[targetNetwork].steps) {
      console.log('\n📄 Creating new steps entry for %s network.\n', targetNetwork)
      deploymentActions[targetNetwork].steps = []
    }

    deploymentActions[targetNetwork].steps.push(step)

    try {
      deploymentActionsJson = JSON.stringify(deploymentActions, null, spacesPerTab)
    } catch (error: any) {
      redLog(`⛔️ ${functionName}(): Failed to stringify JSON for ${targetNetwork}:${step}`)
      throw error
    }

    this.fileIO.overwriteFile(
      DeployConstants.DEPLOYMENT_ACTIONS_JSON_FILENAME,
      deploymentActionsJson,
      functionName
    )
  }

  public getDeploymentActionsJsonSteps(network: string): string[] {
    const functionName = 'getDeploymentActions'

    const deploymentActionsJson = this.fileIO.readFile(
      DeployConstants.DEPLOYMENT_ACTIONS_JSON_FILENAME,
      functionName
    )

    let deploymentActions

    try {
      deploymentActions = JSON.parse(deploymentActionsJson)
    } catch (error: any) {
      redLog(`⛔️ ${functionName}(): Failed to parse JSON steps`)
      throw error
    }

    if (!deploymentActions) {
      redLog(`⛔️ ${functionName}(): Contract actions does not exist.`)
      return
    }

    if (!deploymentActions[network]) {
      redLog(`⛔️ ${functionName}(): Contract actions does not exist on ${network}.`)
      return
    }

    if (!deploymentActions[network].steps) {
      redLog(`⛔️ ${functionName}(): No steps exist on ${network}.`)
      return
    }

    return deploymentActions[network].steps
  }
}
