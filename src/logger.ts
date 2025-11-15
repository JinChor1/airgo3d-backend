import * as winston from "winston"

const consoleOptions: winston.transports.ConsoleTransportOptions = {
  level: process.env.LOG_LEVEL,
  handleExceptions: true
}

const fileOptions: winston.transports.FileTransportOptions = {
  level: process.env.LOG_LEVEL,
  filename: process.env.LOG_FILE_PATH,
  handleExceptions: true,
  maxFiles: 100,
  maxsize: 5242880, // 5MB
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  exitOnError: false,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(consoleOptions),
    new winston.transports.File(fileOptions),
  ]
})

export default logger