import mongoose from 'mongoose';

const checkResultSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  status: {
    type: Number,
    default: null
  },
  success: {
    type: Boolean,
    required: true
  },
  responseTime: {
    type: Number,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('CheckResult', checkResultSchema);