enum COLORS {
  RED = 'RED',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  BLUE = 'BLUE',
  PURPLE = 'PURPLE',
  CYAN = 'CYAN',
  RESET = 'RESET',
}

interface BinaryValue {
  value: string
}

type Colors = {
  [color in COLORS]: BinaryValue
}

export const TEXT_COLOR: Colors = {
  RED: {
    value: '\u001b[1;31m',
  },
  GREEN: {
    value: '\u001b[1;32m',
  },
  YELLOW: {
    value: '\u001b[1;33m',
  },
  BLUE: {
    value: '\u001b[1;34m',
  },
  PURPLE: {
    value: '\u001b[1;35m',
  },
  CYAN: {
    value: '\u001b[1;36m',
  },
  RESET: {
    value: '\u001b[0m',
  },
}

export const BACKGROUND_COLOR: Colors = {
  RED: {
    value: '\u001b[1;41m',
  },
  GREEN: {
    value: '\u001b[1;42m',
  },
  YELLOW: {
    value: '\u001b[1;43m',
  },
  BLUE: {
    value: '\u001b[1;44m',
  },
  PURPLE: {
    value: '\u001b[1;45m',
  },
  CYAN: {
    value: '\u001b[1;46m',
  },
  RESET: {
    value: '\u001b[0m',
  },
}

export function debugLog({
  name = '...',
  shouldLog = true,
  variables,
}: {
  name?: string
  shouldLog?: boolean
  variables: any[]
}): void {
  if (!shouldLog) return
  greenLog(`🐛 DEBUG LOG { ${name} }:`)
  variables.forEach((variable) => {
    if (variable) {
      yellowLog(`\t${variable}\n`)
    } else {
      redLog(`\t${variable}\n`)
    }
  })
}

export function redLog(message: string) {
  colorLog(COLORS.RED, message)
}

export function greenLog(message: string) {
  colorLog(COLORS.GREEN, message)
}

export function yellowLog(message: string) {
  colorLog(COLORS.YELLOW, message)
}

export function blueLog(message: string) {
  colorLog(COLORS.BLUE, message)
}

export function purpleLog(message: string) {
  colorLog(COLORS.PURPLE, message)
}

export function cyanLog(message: string) {
  colorLog(COLORS.CYAN, message)
}

function colorLog(color: COLORS, message: string) {
  console.log('%s%s%s', TEXT_COLOR[color].value, message, TEXT_COLOR[COLORS.RESET].value)
}
