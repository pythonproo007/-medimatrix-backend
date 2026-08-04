const Purchase = require('../models/Purchase');
const PurchaseDetails = require('../models/PurchaseDetails');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const Stock = require('../models/Stock');
const StockIn = require('../models/StockIn');
const Notification = require('../models/Notification');
const LowStockNotification = require('../models/LowStockNotification');

const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    res.json({ success: true, count: purchases.length, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPurchase = async (req, res) => {
  try {
    const { supplierName, supplierPhone, supplierInvoiceNo, items, paymentStatus, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Purchase must contain at least one item.' });
    }

    // Handle supplier lookup/creation
    let supplier = await Supplier.findOne({ name: supplierName.trim() });
    if (!supplier) {
      supplier = await Supplier.create({
        name: supplierName.trim(),
        phone: supplierPhone || '000-000-0000',
        email: ''
      });
    }

    const purchaseNo = `PO-${Date.now().toString().slice(-6)}`;
    let totalAmount = 0;
    const detailsRows = [];

    // First create purchase transaction header
    const purchase = await Purchase.create({
      purchaseNo,
      supplierId: supplier._id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      supplierInvoiceNo: supplierInvoiceNo || '',
      totalAmount: 0, // Update later
      paymentStatus: paymentStatus || 'Paid',
      notes: notes || ''
    });

    for (let item of items) {
      const qty = Number(item.quantity);
      const buyPrice = Number(item.purchasePrice);
      const sellPrice = Number(item.sellingPrice);
      const lineCost = qty * buyPrice;
      totalAmount += lineCost;

      // Upsert medicine in inventory
      let med = await Medicine.findOne({ name: { $regex: `^${item.medicineName.trim()}$`, $options: 'i' } });

      if (med) {
        med.quantity += qty;
        med.purchasePrice = buyPrice;
        med.sellingPrice = sellPrice;
        med.batchNumber = item.batchNumber || med.batchNumber;
        med.expiryDate = item.expiryDate || med.expiryDate;
        if (item.medicineType) med.medicineType = item.medicineType;
        await med.save();
      } else {
        // Create new medicine
        med = await Medicine.create({
          name: item.medicineName,
          code: `MED-${Math.floor(100000 + Math.random() * 900000)}`,
          category: item.category || 'General Healthcare',
          medicineType: item.medicineType || 'Tablet',
          activeIngredient: item.activeIngredient || item.medicineName.split(' ')[0],
          manufacturer: supplierName,
          batchNumber: item.batchNumber || `BT-${Date.now().toString().slice(-4)}`,
          quantity: qty,
          minStockAlert: 15,
          purchasePrice: buyPrice,
          sellingPrice: sellPrice,
          expiryDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          rackLocation: 'Shelf A1'
        });
      }

      // Upsert Stock Item
      let stockItem = await Stock.findOne({ medicineId: med._id, batchNumber: med.batchNumber });
      if (stockItem) {
        stockItem.currentQuantity += qty;
        await stockItem.save();
      } else {
        stockItem = await Stock.create({
          medicineId: med._id,
          batchNumber: med.batchNumber,
          currentQuantity: qty,
          purchasePrice: buyPrice,
          sellingPrice: sellPrice,
          expiryDate: med.expiryDate,
          rackLocation: med.rackLocation
        });
      }

      // Create PurchaseDetails row
      const detailRow = await PurchaseDetails.create({
        purchaseId: purchase._id,
        medicineId: med._id,
        medicineName: med.name,
        medicineType: med.medicineType,
        category: med.category,
        batchNumber: med.batchNumber,
        quantity: qty,
        purchasePrice: buyPrice,
        sellingPrice: sellPrice,
        expiryDate: med.expiryDate,
        totalCost: lineCost
      });

      detailsRows.push(detailRow);

      // Record Stock In Log
      await StockIn.create({
        medicineId: med._id,
        batchNumber: med.batchNumber,
        quantity: qty,
        purchasePrice: buyPrice,
        supplierId: supplier._id,
        invoiceNumber: purchaseNo,
        notes: `Supplier Purchase Intake (${supplierName})`
      });

      // Clear low stock notification if resolved
      if (med.quantity > med.minStockAlert) {
        await LowStockNotification.findOneAndUpdate(
          { medicineId: med._id, status: 'Pending' },
          { status: 'Restocked', currentQuantity: med.quantity }
        );
      }
    }

    // Save actual totalAmount in header
    purchase.totalAmount = totalAmount;
    await purchase.save();

    await Notification.create({
      type: 'system',
      title: 'Supplier Purchase Logged',
      message: `Purchase Order ${purchaseNo} from ${supplierName} saved. Added stock for ${items.length} items.`
    });

    // Support old dashboard mapping by returning items array in payload
    const purchaseObject = purchase.toObject();
    purchaseObject.items = detailsRows;

    res.status(201).json({
      success: true,
      message: `Purchase order ${purchaseNo} recorded and stock updated automatically!`,
      data: purchaseObject
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPurchases,
  createPurchase,
  getSuppliers,
  createSupplier
};
