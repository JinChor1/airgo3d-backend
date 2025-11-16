import * as express from 'express'
import * as multer from 'multer'
import * as path from 'path'
import Panorama from '../models/panorama'
import { Request, Response } from 'express'

const router = express.Router()
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// Multer setup (file upload handling)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, unique + path.extname(file.originalname))
  }
})
const upload = multer({ storage })

/* == API ROUTES =========================================================================================== */
/**
    * Upload panorama
    * @route POST /api/panoramas/upload
    * @param {File} image - Image file to upload
    * @returns {PanoramaInterface} 200 - Uploaded panorama document
    * @returns {Error} 400 - No file provided
    * @returns {Error} 500 - Internal server error
*/
router.post('/upload', (upload.single('image') as unknown) as express.RequestHandler, async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    const { originalname, filename, mimetype, size } = req.file as any
    const doc = await Panorama.create({ name: originalname, filename, mimetype, size })
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * List with search, filter, pagination
    * @route GET /api/panoramas
    * @param {string} q - Search query for name
    * @param {boolean} bookmarked - Filter by bookmarked status
    * @param {number} page - Page number (default: 1)
    * @param {number} limit - Items per page (default: 20)
    * @returns {object} 200 - List of panoramas with total count
    * @returns {Error} 500 - Internal server error
*/
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, bookmarked, page = 1, limit = 20 } = req.query as any
    const filter: any = {}
    if (q) filter.name = { $regex: q, $options: 'i' }
    if (bookmarked === 'true') filter.bookmarked = true
    if (bookmarked === 'false') filter.bookmarked = false
    const skip = (Number(page) - 1) * Number(limit)
    const total = await Panorama.countDocuments(filter)
    const items = await Panorama.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
    res.json({ total, items })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Get image file for viewer/download
    * @route GET /api/panoramas/file/:id
    * @param {string} id - Panorama document ID
    * @returns {File} 200 - Image file
    * @returns {Error} 404 - Panorama not found
    * @returns {Error} 500 - Internal server error
*/
router.get('/file/:id', async (req: Request, res: Response) => {
  try {
    const doc = await Panorama.findById(req.params.id)
    if (!doc) return res.status(404).end()
    const filepath = path.join(UPLOAD_DIR, doc.filename)
    res.sendFile(filepath)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Toggle bookmark
    * @route POST /api/panoramas/:id/bookmark
    * @param {string} id - Panorama document ID
    * @returns {PanoramaInterface} 200 - Updated panorama document
    * @returns {Error} 404 - Panorama not found
    * @returns {Error} 500 - Internal server error
*/
router.post('/:id/bookmark', async (req: Request, res: Response) => {
  try {
    const doc = await Panorama.findById(req.params.id)
    if (!doc) return res.status(404).end()
    doc.bookmarked = !doc.bookmarked
    await doc.save()
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Get analytics summary (dashboard)
    * @route GET /api/panoramas/analytics/summary
    * @returns {object} 200 - Analytics summary
    * @returns {Error} 500 - Internal server error
*/
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const total = await Panorama.countDocuments()
    const bookmarked = await Panorama.countDocuments({ bookmarked: true })
    res.json({ total, bookmarked, unbookmarked: total - bookmarked })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
