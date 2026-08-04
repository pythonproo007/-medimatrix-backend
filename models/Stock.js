const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNumber: { type: String, required: true },
  currentQuantity: { type: Number, required: true, default: 0 },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  rackLocation: { type: String, default: 'Shelf A1' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stock', StockSchema);
