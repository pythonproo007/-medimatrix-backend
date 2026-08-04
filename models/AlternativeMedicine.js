const mongoose = require('mongoose');

const AlternativeMedicineSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  alternativeMedicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  notes: { type: String, default: 'Same active pharmaceutical ingredient or therapeutic category' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AlternativeMedicine', AlternativeMedicineSchema);
