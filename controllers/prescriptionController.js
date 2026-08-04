const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const SaleDetails = require('../models/SaleDetails');
const Stock = require('../models/Stock');
const StockOut = require('../models/StockOut');
const Payment = require('../models/Payment');
const HomeDelivery = require('../models/HomeDelivery');
const Notification = require('../models/Notification');
const LowStockNotification = require('../models/LowStockNotification');

const getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find().sort({ createdAt: -1 });
    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPrescription = async (req, res) => {
  try {
    const { doctorName, doctorRegNo, clinicHospital, patientName, patientPhone, items, notes } = req.body;
    const rxNo = `RX-${Date.now().toString().slice(-6)}`;

    let customer = await Customer.findOne({ phone: patientPhone });
    if (!customer && patientName && patientPhone) {
      customer = await Customer.create({
        name: patientName,
        phone: patientPhone
      });
    }

    const prescription = await Prescription.create({
      prescriptionNo: rxNo,
      doctorName,
      doctorRegNo: doctorRegNo || 'DOC-REG-9941',
      clinicHospital: clinicHospital || 'City Health Clinic',
      patientName,
      patientPhone,
      customerId: customer ? customer._id : null,
      items,
      notes: notes || ''
    });

    await Notification.create({
      type: 'prescription_dispensed',
      title: 'New Prescription Logged',
      message: `Prescription ${rxNo} from Dr. ${doctorName} logged for patient ${patientName}.`
    });

    res.status(201).json({ success: true, message: 'Prescription created successfully', data: prescription });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// DISPENSE PRESCRIPTION WITH AUTOMATED STOCK-OUT & DISCOUNT OPTIONS
const dispensePrescription = async (req, res) => {
  try {
    const { isHomeDelivery, deliveryAddress, discountType, discountValue, promoCode } = req.body;
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ success: false, error: 'Prescription not found' });
    }

    if (prescription.status === 'Dispensed') {
      return res.status(400).json({ success: false, error: 'Prescription has already been dispensed.' });
    }

    const itemsToDispense = [];
    let grandTotal = 0;

    // Verify stock availability
    for (let pItem of prescription.items) {
      let med = null;
      if (pItem.medicineId) {
        med = await Medicine.findById(pItem.medicineId);
      }
      if (!med) {
        med = await Medicine.findOne({ name: { $regex: pItem.medicineName, $options: 'i' } });
      }

      if (!med) {
        return res.status(404).json({
          success: false,
          error: `Medicine "${pItem.medicineName}" not found in stock.`
        });
      }

      if (med.quantity < pItem.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for "${med.name}". Required: ${pItem.quantity}, Available: ${med.quantity}`
        });
      }

      const itemTotal = med.sellingPrice * pItem.quantity;
      grandTotal += itemTotal;

      itemsToDispense.push({
        medicine: med,
        quantity: pItem.quantity,
        totalPrice: itemTotal
      });
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

    // Create Customer lookup
    let customer = await Customer.findOne({ phone: prescription.patientPhone });
    if (!customer && prescription.patientName) {
      customer = await Customer.create({
        name: prescription.patientName,
        phone: prescription.patientPhone
      });
    }

    // Process Discount Options
    let manualDiscount = 0;
    if (discountType === 'percentage' && discountValue) {
      manualDiscount = Math.round(grandTotal * (Number(discountValue) / 100));
    } else if (discountType === 'amount' && discountValue) {
      manualDiscount = Math.min(grandTotal, Number(discountValue));
    }

    let regularDiscount = 0;
    let isRegularDiscountApplied = false;

    if (customer) {
      customer.visitsCount += 1;
      if (customer.visitsCount >= 3 || customer.totalSpent > 1000) {
        customer.isRegular = true;
        customer.discountRate = 10;
      }

      if (customer.isRegular) {
        regularDiscount = Math.round(grandTotal * 0.10);
        isRegularDiscountApplied = true;
      }
    }

    const finalDiscount = Math.max(manualDiscount, regularDiscount);
    const finalTotal = Math.max(0, grandTotal - finalDiscount);

    if (customer) {
      customer.totalSpent += finalTotal;
      await customer.save();
    }

    const sale = await Sale.create({
      invoiceNo,
      customerId: customer ? customer._id : null,
      customerName: prescription.patientName,
      customerPhone: prescription.patientPhone,
      prescriptionId: prescription._id,
      doctorName: prescription.doctorName,
      subtotal: grandTotal,
      totalDiscount: finalDiscount,
      grandTotal: finalTotal,
      paymentMethod: 'Cash',
      isRegularCustomerDiscountApplied: isRegularDiscountApplied,
      isHomeDelivery: Boolean(isHomeDelivery),
      deliveryAddress: deliveryAddress || (customer ? customer.address : ''),
      deliveryStatus: isHomeDelivery ? 'Pending' : 'N/A'
    });

    const detailsRows = [];

    // Deduct stock, log movements, save details
    for (let update of itemsToDispense) {
      const prevQty = update.medicine.quantity;
      update.medicine.quantity -= update.quantity;
      await update.medicine.save();

      // Update Stock Item
      const stockItem = await Stock.findOne({ medicineId: update.medicine._id, batchNumber: update.medicine.batchNumber });
      if (stockItem) {
        stockItem.currentQuantity = Math.max(0, stockItem.currentQuantity - update.quantity);
        await stockItem.save();
      }

      // Create SaleDetails Row
      const detail = await SaleDetails.create({
        saleId: sale._id,
        medicineId: update.medicine._id,
        medicineName: update.medicine.name,
        batchNumber: update.medicine.batchNumber,
        quantity: update.quantity,
        unitPrice: update.medicine.sellingPrice,
        discount: 0,
        total: update.totalPrice
      });

      detailsRows.push(detail);

      // Create StockOut Record
      await StockOut.create({
        medicineId: update.medicine._id,
        batchNumber: update.medicine.batchNumber,
        quantity: update.quantity,
        transactionType: 'PRESCRIPTION_OUT',
        referenceId: invoiceNo,
        reason: `Prescription Auto Stock-Out (${prescription.prescriptionNo})`
      });

      // Low stock notification
      if (update.medicine.quantity <= update.medicine.minStockAlert) {
        await Notification.create({
          type: 'low_stock',
          title: 'Low Stock Alert Triggered!',
          message: `Stock for ${update.medicine.name} dropped to ${update.medicine.quantity} units.`
        });

        await LowStockNotification.create({
          medicineId: update.medicine._id,
          medicineName: update.medicine.name,
          currentQuantity: update.medicine.quantity,
          threshold: update.medicine.minStockAlert,
          status: 'Pending'
        });
      }
    }

    // Create Payment record
    await Payment.create({
      saleId: sale._id,
      customerId: customer ? customer._id : null,
      amount: finalTotal,
      paymentMethod: 'Cash',
      paymentStatus: 'Completed',
      transactionId: `TXN-${Date.now().toString().slice(-6)}`
    });

    // Create HomeDelivery queue if toggled
    if (isHomeDelivery) {
      await HomeDelivery.create({
        saleId: sale._id,
        invoiceNo,
        customerId: customer ? customer._id : null,
        customerName: prescription.patientName,
        customerPhone: prescription.patientPhone,
        deliveryAddress: deliveryAddress || (customer ? customer.address : ''),
        deliveryStatus: 'Pending',
        deliveryBoyName: 'Courier Service'
      });
    }

    // Mark prescription as dispensed
    prescription.status = 'Dispensed';
    prescription.dispensedAt = new Date();
    prescription.items.forEach(i => i.fulfilled = true);
    await prescription.save();

    await Notification.create({
      type: 'prescription_dispensed',
      title: 'Prescription Auto Stock-Out Completed',
      message: `Prescription ${prescription.prescriptionNo} dispensed. Invoice ${invoiceNo} created.`
    });

    res.json({
      success: true,
      message: `Prescription dispensed & stock automatically updated! Invoice ${invoiceNo} generated.`,
      data: { prescription, sale }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPrescriptions,
  createPrescription,
  dispensePrescription
};
