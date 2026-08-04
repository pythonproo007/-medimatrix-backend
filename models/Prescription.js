const mongoose = require('mongoose');

const PrescribedItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineName: { type: String, required: true },
  quantity: { type: Number, required: true },
  dosage: { type: String, default: '1 tablet daily' },
  duration: { type: String, default: '5 days' },
  fulfilled: { type: Boolean, default: false }
});

const PrescriptionSchema = new mongoose.Schema({
  prescriptionNo: { type: String, required: true, unique: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  doctorName: { type: String, required: true },
  doctorRegNo: { type: String, default: 'DOC-REG-9941' },
  clinicHospital: { type: String, default: 'City Health Care Clinic' },
  patientName: { type: String, required: true },
  patientPhone: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  items: [PrescribedItemSchema],
  status: { type: String, enum: ['Pending', 'Dispensed', 'Cancelled'], default: 'Pending' },
  dispensedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);
