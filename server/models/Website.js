import mongoose from 'mongoose';

const websiteSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  checkInterval: {
    type: Number,
    default: null,
    min: 10000
  }
}, {
  timestamps: true
});

export default mongoose.model('Website', websiteSchema);