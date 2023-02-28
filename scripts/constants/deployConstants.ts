export namespace DeployConstants {
  export const CONTRACT_DEPLOYMENTS_JSON_FILENAME = 'scripts/autogen/contract-deployments.json'
  export const JSON_BLANK_FILENAME = 'scripts/util/files/rawtext/json-blank.txt'

  export const DEPLOYMENT_ACTIONS_JSON_FILENAME = 'scripts/autogen/deployment-actions.json'

  export const CONTRACT_DEPLOYMENTS_KEYS_TS_FILENAME =
    'scripts/autogen/contract-deployments-keys.ts'
  export const KEYS_TS_PREPEND = 'scripts/util/files/rawtext/keys-ts-prepend.txt'
  export const KEYS_TS_POSTPEND = 'scripts/util/files/rawtext/keys-ts-postpend.txt'

  export const ERC20_ABI: string[] = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint)',
    'function balanceOf(address) view returns (uint)',
    'function approve(address spender, uint256 amount)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function transfer(address to, uint amount)',
    'function transferFrom(address sender, address recipient, uint256 amount)',
    'event Transfer(address indexed from, address indexed to, uint amount)',
  ]

  export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  export const retryAsyncOperation = ({
    operation,
    delay = 1000,
    retries = 1,
  }: {
    operation: any
    delay?: number
    retries?: number
  }) =>
    new Promise((resolve, reject) => {
      return operation()
        .then(resolve)
        .catch((reason: string) => {
          if (retries > 0) {
            return wait(delay)
              .then(retryAsyncOperation.bind(null, operation, delay, retries - 1))
              .then(resolve)
              .catch(reject)
          }

          return reject(reason)
        })
    })
}
