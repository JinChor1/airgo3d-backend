import * as dotenv from "dotenv"
// Load environment variables
const envConfig = dotenv.config()
for (const k in envConfig.parsed) {
  process.env[k] = envConfig.parsed[k]
}

import * as http from "http"
import * as fs from 'fs'
import * as path from 'path'
import app from "./app"
import logger from "./logger"
import mongoose = require('mongoose')

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI
mongoose.connect(mongoUri).then(() => {
  logger.info('Connected to MongoDB')
}).catch((err: any) => {
  logger.error('MongoDB connection error', err)
})

// Create HTTP server
const httpServer = http.createServer(app)
httpServer.on("error", (error: NodeJS.ErrnoException) => {
  if (error.syscall !== "listen") {
    throw error
  } else {
    throw error
  }
})

// Start server
httpServer.on("listening", () => {
  logger.info(`HTTP server listening at ${process.env.PORT}`)
})
const port = process.env.PORT || 3000
httpServer.listen(port)

export default httpServer
