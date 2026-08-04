const mongoose = require('mongoose');

const PurchaseDetailsSchema = new mongoose.Schema({
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  medicineType: { type: String, default: 'Tablet' },
  category: { type: String, default: 'General Healthcare' },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  totalCost: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PurchaseDetails', PurchaseDetailsSchema);
