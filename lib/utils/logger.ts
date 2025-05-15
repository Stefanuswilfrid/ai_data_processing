type LogLevel = "debug" | "info" | "warn" | "error"

class Logger {
  private level: LogLevel = "info"

  constructor() {
    // Set log level from environment if available
    if (typeof process !== "undefined" && process.env.LOG_LEVEL) {
      this.level = process.env.LOG_LEVEL as LogLevel
    }
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }

    return levels[messageLevel] >= levels[this.level]
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog("error")) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }
}

export const logger = new Logger()
