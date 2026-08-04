const mongoose = require('mongoose');

const StockInSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  invoiceNumber: { type: String, default: '' },
  receivedDate: { type: Date, default: Date.now },
  notes: { type: String, default: '' }
});

module.exports = mongoose.model('StockIn', StockInSchema);
