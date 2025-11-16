import mongoose = require('mongoose')

export interface PanoramaInterface extends mongoose.Document {
  name: string
  filename: string
  mimetype: string
  size: number
  bookmarked: boolean
  createdAt: Date
}

const PanoramaSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  mimetype: { type: String },
  size: { type: Number },
  bookmarked: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model<PanoramaInterface>('Panorama', PanoramaSchema)
