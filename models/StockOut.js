const mongoose = require('mongoose');

const StockOutSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  transactionType: {
    type: String,
    enum: ['SALE_AUTO_OUT', 'PRESCRIPTION_OUT', 'EXPIRED_OUT', 'MANUAL_OUT'],
    required: true
  },
  referenceId: { type: String, default: '' }, // INV No or Rx No or ADJ No
  reason: { type: String, default: 'Inventory Reduction' },
  dispatchedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StockOut', StockOutSchema);
