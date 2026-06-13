import mongoose from 'mongoose';

const apiCheckResultSchema = new mongoose.Schema({
  apiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Api',
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

export default mongoose.model('ApiCheckResult', apiCheckResultSchema);
