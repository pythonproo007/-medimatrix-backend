const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, trim: true },
  medicineType: { type: String, default: 'Tablet', trim: true },
  activeIngredient: { type: String, default: '', trim: true },
  manufacturer: { type: String, default: 'Generic' },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  minStockAlert: { type: Number, default: 15 },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  rackLocation: { type: String, default: 'Shelf A1' },
  requiresPrescription: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Virtual helper for stock status
MedicineSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.minStockAlert;
});

// Virtual helper for expiry status
MedicineSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiryDate) return false;
  const today = new Date();
  const diffDays = Math.ceil((new Date(this.expiryDate) - today) / (1000 * 60 * 60 * 24));
  return diffDays <= 60;
});

MedicineSchema.set('toJSON', { virtuals: true });
MedicineSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Medicine', MedicineSchema);
