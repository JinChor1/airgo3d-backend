import * as cors from "cors"
import * as express from "express"
import * as morgan from "morgan"
import * as path from 'path'
import logger from "./logger"
import panoramaRouter from './routes/panorama'

const app = express()
app.use(cors())
app.use(morgan("tiny"))
app.use(express.json({ limit: "500mb" }))
app.use(express.urlencoded({ limit: "500mb", extended: true }))

// Serve static files
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(UPLOAD_DIR))
// Panorama API routes
app.use('/api/panoramas', panoramaRouter)

// Health check
app.get("/", (req, res) => {
  res.status(200).send("Hello")
})

// error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    logger.error(err)
    res.status(500).send()
  } else {
    next()
  }
})
// catch 404 and forward to error handler
app.use((req: any, res: any) => {
  res.status(404).send()
})

export default app
