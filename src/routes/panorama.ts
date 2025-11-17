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
    * @route GET /api/panoramas/file/:name
    * @param {string} name - Panorama document name
    * @returns {File} 200 - Image file
    * @returns {Error} 404 - Panorama not found
    * @returns {Error} 500 - Internal server error
*/
router.get('/file/:name', async (req: Request, res: Response) => {
  try {
    const doc = await Panorama.findOne({ name: req.params.name })
    if (!doc) return res.status(404).end()
    const filepath = path.join(UPLOAD_DIR, doc.filename)
    res.sendFile(filepath)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Toggle bookmark
    * @route POST /api/panoramas/:name/bookmark
    * @param {string} name - Panorama document name
    * @returns {PanoramaInterface} 200 - Updated panorama document
    * @returns {Error} 404 - Panorama not found
    * @returns {Error} 500 - Internal server error
*/
router.post('/:name/bookmark', async (req: Request, res: Response) => {
  try {
    const doc = await Panorama.findOne({ name: req.params.name })
    if (!doc) return res.status(404).end()
    doc.bookmarked = !doc.bookmarked
    await doc.save()
    res.json(doc)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Get analytics summary (dashboard - cards)
    * @route GET /api/panoramas/analytics/cards
    * @returns {number} total - Total panoramas
    * @returns {number} bookmarked - Total bookmarked panoramas
    * @returns {number} unbookmarked - Total unbookmarked panoramas
    * @returns {number} inactive - Total inactive panoramas
    * @returns {object} 200 - Analytics summary (cards)
    * @returns {Error} 500 - Internal server error
*/
router.get('/analytics/cards', async (req: Request, res: Response) => {
  try {
    const total = await Panorama.countDocuments({ isActive: true })
    const bookmarked = await Panorama.countDocuments({ bookmarked: true, isActive: true })
    const unbookmarked = total - bookmarked
    const inactive = await Panorama.countDocuments({ isActive: false })
    res.json({ total, bookmarked, unbookmarked, inactive })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Get analytics summary (dashboard - cards graphs)
    * @route GET /api/panoramas/analytics/daily-cards
    * @returns {number[]} totalUploaded - Array of total uploaded counts per day
    * @returns {number[]} totalBookmarked - Array of total bookmarked counts per day
    * @returns {number[]} totalUnbookmarked - Array of total unbookmarked counts per day
    * @returns {number[]} totalInactive - Array of total inactive counts per day
    * @returns {object} 200 - Analytics summary (cards graphs)
    * @returns {Error} 500 - Internal server error
*/
router.get('/analytics/daily-cards', async (req: Request, res: Response) => {
  try {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 6 * 24 * 3600 * 1000)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    const matchStage: any = { createdAt: { $gte: startDate, $lte: new Date(endDate.getTime() + 24 * 3600 * 1000 - 1) } }

    const pipeline: any[] = [
      { $match: matchStage },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, bookmarked: 1, isActive: 1 } },
      {
        $group: {
          _id: '$day',
          uploadedCount: { $sum: { $cond: [ { $eq: ['$isActive', true] }, 1, 0 ] } },
          bookmarkedCount: { $sum: { $cond: [ { $and: [ { $eq: ['$bookmarked', true] }, { $eq: ['$isActive', true] } ] }, 1, 0 ] } },
          unbookmarkedCount: { $sum: { $cond: [ { $and: [ { $eq: ['$bookmarked', false] }, { $eq: ['$isActive', true] } ] }, 1, 0 ] } },
          inactiveCount: { $sum: { $cond: [ { $eq: ['$isActive', false] }, 1, 0 ] } }
        }
      },
      { $sort: { _id: 1 } }
    ]

    const groups = await Panorama.aggregate(pipeline)

    // Build date list and fill zeros for missing days
    const days: string[] = []
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10)) // 'YYYY-MM-DD'
    }

    const uploadedMap = new Map(groups.map((g: any) => [g._id, g.uploadedCount || 0]))
    const bookmarkedMap = new Map(groups.map((g: any) => [g._id, g.bookmarkedCount || 0]))
    const unbookmarkedMap = new Map(groups.map((g: any) => [g._id, g.unbookmarkedCount || 0]))
    const inactiveMap = new Map(groups.map((g: any) => [g._id, g.inactiveCount || 0]))

    const result = {
      totalUploaded: days.map(d => uploadedMap.get(d) || 0),
      totalBookmarked: days.map(d => bookmarkedMap.get(d) || 0),
      totalUnbookmarked: days.map(d => unbookmarkedMap.get(d) || 0),
      totalInactive: days.map(d => inactiveMap.get(d) || 0),
      days // optional: include labels if frontend needs them
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Get analytics summary (dashboard - bar chart)
    * @route GET /api/panoramas/analytics/bar-chart
    * @returns {object} 200 - Analytics summary (bar chart)
    * @returns {Error} 500 - Internal server error
*/
router.get('/analytics/bar-chart', async (req: Request, res: Response) => {
  try {
    // Aggregate by year and month
    const groups = await Panorama.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          bookmarkCount: {
            $sum: {
              $cond: [ { $and: [ '$bookmarked', { $eq: [ '$isActive', true ] } ] }, 1, 0 ]
            }
          },
          activeCount: {
            $sum: { $cond: [ { $eq: [ '$isActive', true ] }, 1, 0 ] }
          },
          inactiveCount: {
            $sum: { $cond: [ { $eq: [ '$isActive', false ] }, 1, 0 ] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const result: Array<{ monthYear: string, type: string, value: number }> = []

    for (const g of groups) {
      const year = g._id.year
      const month = g._id.month // 1-12
      const label = `${monthNames[month - 1]} ${year}`
      result.push({ monthYear: label, type: 'bookmark', value: g.bookmarkCount || 0 })
      result.push({ monthYear: label, type: 'active', value: g.activeCount || 0 })
      result.push({ monthYear: label, type: 'inactive', value: g.inactiveCount || 0 })
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
    * Get analytics summary (dashboard - pie chart)
    * @route GET /api/panoramas/analytics/pie-chart
    * @returns {object} 200 - Analytics summary (pie chart)
    * @returns {Error} 500 - Internal server error
*/
router.get('/analytics/pie-chart', async (req: Request, res: Response) => {
  try {
    const active = await Panorama.countDocuments({ isActive: true })
    const bookmark = await Panorama.countDocuments({ bookmarked: true, isActive: true })
    const inactive = await Panorama.countDocuments({ isActive: false })

    const data = [
      { type: 'bookmark', value: bookmark },
      { type: 'active', value: active },
      { type: 'inactive', value: inactive }
    ]

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
