const mongoose = require('mongoose');

const MedicineTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }, // e.g. Tablet, Capsule, Syrup, Ointment
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MedicineType', MedicineTypeSchema);
