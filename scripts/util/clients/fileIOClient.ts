import { appendFileSync, readFileSync, writeFileSync } from 'fs'
import { redLog } from '../../constants/colorLog'
import { exec } from 'child_process'

export class FileIOClient {
  private execute: Execute

  constructor() {
    this.execute = new Execute()
  }

  public readFile(filename: string, functionName: string): string {
    try {
      return readFileSync(filename, 'utf-8')
    } catch (error: any) {
      this.postError(functionName, 'readFileSync', filename)
      throw error
    }
  }

  public overwriteFile(filename: string, content: string, functionName: string) {
    try {
      writeFileSync(filename, content)
    } catch (error: any) {
      this.postError(functionName, 'writeFileSync', filename)
      throw error
    }
  }

  public appendToFile(filename: string, content: string, functionName: string) {
    try {
      appendFileSync(filename, content)
    } catch (error: any) {
      this.postError(functionName, 'appendFileSync', filename)
      throw error
    }
  }

  public async deleteLastLine(filename: string, functionName: string): Promise<any> {
    try {
      return await this.execute.deleteLastLine(filename, functionName)
    } catch (error: any) {
      console.log(error)
      throw error
    }
  }

  public postError(functionName: string, actionName: string, filename: string) {
    redLog(`⛔️ ${functionName}(): Failed to ${actionName} for ${filename}.`)
  }
}

export class Execute {
  public async deleteLastLine(filename: string, functionName: string) {
    const command = `sed '$d' ${filename}`
    const errmsgPrefix = `${functionName} -> deleteLastLine(${filename})`

    return await this.execute(command, errmsgPrefix)
  }

  private execute(command: string, errmsgPrefix: string) {
    return new Promise(function (resolve, reject) {
      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          redLog(`⛔️ ${errmsgPrefix}: error: ${error.message}`)
          reject()
          return
        }
        if (stderr) {
          redLog(`⛔️ ${errmsgPrefix}: stderr: ${stderr}`)
          reject(stderr)
          return
        }
        resolve(stdout)
      })
    })
  }
}
