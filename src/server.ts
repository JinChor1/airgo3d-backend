import * as dotenv from "dotenv"
const envConfig = dotenv.config()
for (const k in envConfig.parsed) {
  process.env[k] = envConfig.parsed[k]
}
import app from "./app"
import logger from "./logger"
import * as http from "http"

const httpServer = http.createServer(app)
httpServer.on("error", (error: NodeJS.ErrnoException) => {
  if (error.syscall !== "listen") {
    throw error
  } else {
    throw error
  }
})

httpServer.on("listening", () => {
  logger.info(`HTTP server listening at ${process.env.PORT}`)
})

httpServer.listen(process.env.PORT)

export default httpServer
