const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  purchaseNo: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, required: true, trim: true },
  supplierPhone: { type: String, default: '', trim: true },
  supplierInvoiceNo: { type: String, default: '' },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Paid' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', PurchaseSchema);
