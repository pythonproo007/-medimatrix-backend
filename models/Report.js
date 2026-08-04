const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reportType: { type: String, enum: ['Sales', 'Purchase', 'Stock', 'Financial'], required: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  generatedBy: { type: String, default: 'System' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
