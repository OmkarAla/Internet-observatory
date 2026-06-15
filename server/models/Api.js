import mongoose from 'mongoose';

const apiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    default: 'GET'
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  expectedStatus: {
    type: Number,
    default: 200
  },
  timeout: {
    type: Number,
    default: 10000
  },
  retries: {
    type: Number,
    default: 3
  },
  enabled: {
    type: Boolean,
    default: true
  },
  checkInterval: {
    type: Number,
    default: null,
    min: 10000
  }
}, {
  timestamps: true
});

export default mongoose.model('Api', apiSchema);