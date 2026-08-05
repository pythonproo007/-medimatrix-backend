const Medicine = require('../models/Medicine');
const MedicineCategory = require('../models/MedicineCategory');
const MedicineType = require('../models/MedicineType');
const Company = require('../models/Company');
const Stock = require('../models/Stock');
const StockIn = require('../models/StockIn');
const StockOut = require('../models/StockOut');
const Notification = require('../models/Notification');
const ExpiryNotification = require('../models/ExpiryNotification');
const LowStockNotification = require('../models/LowStockNotification');

// Get all medicines with search & filter
const getMedicines = async (req, res) => {
  try {
    const { search, category, medicineType, filterAlert } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { batchNumber: { $regex: search, $options: 'i' } },
        { activeIngredient: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (medicineType) {
      query.medicineType = medicineType;
    }

    let medicines = await Medicine.find(query).sort({ name: 1 });

    const now = new Date();
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    if (filterAlert === 'low_stock') {
      medicines = medicines.filter(m => m.quantity <= m.minStockAlert);
    } else if (filterAlert === 'expiring_soon') {
      medicines = medicines.filter(m => {
        const exp = new Date(m.expiryDate);
        return exp >= now && exp <= sixtyDaysLater;
      });
    } else if (filterAlert === 'expired') {
      medicines = medicines.filter(m => new Date(m.expiryDate) < now);
    }

    res.json({ success: true, count: medicines.length, data: medicines });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Find Alternate Medicines
const getAlternates = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'Medicine not found' });
    }

    const { allergies } = req.query;
    let allergyList = [];
    if (allergies) {
      allergyList = allergies.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    }

    let candidates = await Medicine.find({
      _id: { $ne: medicine._id },
      $or: [
        { activeIngredient: { $regex: medicine.activeIngredient || medicine.name.split(' ')[0], $options: 'i' } },
        { category: medicine.category }
      ],
      quantity: { $gt: 0 }
    });

    if (candidates.length === 0) {
      candidates = await Medicine.find({
        _id: { $ne: medicine._id },
        quantity: { $gt: 0 }
      });
    }

    let safeAlternates = candidates;
    if (allergyList.length > 0) {
      safeAlternates = candidates.filter(alt => {
        const altName = alt.name.toLowerCase();
        const altIngredient = (alt.activeIngredient || '').toLowerCase();
        const altCategory = alt.category.toLowerCase();

        const isAllergic = allergyList.some(allergen => 
          altName.includes(allergen) || 
          altIngredient.includes(allergen) ||
          altCategory.includes(allergen)
        );
        return !isAllergic;
      });
    }

    res.json({
      success: true,
      originalMedicine: medicine,
      patientAllergies: allergyList,
      count: safeAlternates.length,
      alternates: safeAlternates
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add new medicine batch (Stock In)
const createMedicine = async (req, res) => {
  try {
    const {
      name,
      code,
      category,
      medicineType,
      activeIngredient,
      manufacturer,
      batchNumber,
      quantity,
      minStockAlert,
      purchasePrice,
      sellingPrice,
      expiryDate,
      rackLocation,
      requiresPrescription,
      notes
    } = req.body;

    const qtyNumber = Number(quantity || 0);
    let existingCode = null;
    if (code) {
      existingCode = await Medicine.findOne({ code });
    }
    if (!existingCode && name) {
      const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      existingCode = await Medicine.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
    }

    // Ensure category and type exist in the DB
    if (category) {
      await MedicineCategory.findOneAndUpdate(
        { name: category },
        { name: category },
        { upsert: true, new: true }
      );
    }
    if (medicineType) {
      await MedicineType.findOneAndUpdate(
        { name: medicineType },
        { name: medicineType },
        { upsert: true, new: true }
      );
    }
    if (manufacturer) {
      await Company.findOneAndUpdate(
        { name: manufacturer },
        { name: manufacturer },
        { upsert: true, new: true }
      );
    }

    if (existingCode) {
      const prevQty = existingCode.quantity;
      existingCode.quantity += qtyNumber;
      if (batchNumber) existingCode.batchNumber = batchNumber;
      if (expiryDate) existingCode.expiryDate = expiryDate;
      if (purchasePrice !== undefined && purchasePrice !== '') existingCode.purchasePrice = Number(purchasePrice);
      if (sellingPrice !== undefined && sellingPrice !== '') existingCode.sellingPrice = Number(sellingPrice);
      if (medicineType) existingCode.medicineType = medicineType;
      if (activeIngredient) existingCode.activeIngredient = activeIngredient;
      await existingCode.save();

      // Upsert Stock Item
      let stockItem = await Stock.findOne({ medicineId: existingCode._id, batchNumber: existingCode.batchNumber });
      if (stockItem) {
        stockItem.currentQuantity += qtyNumber;
        if (purchasePrice !== undefined && purchasePrice !== '') stockItem.purchasePrice = Number(purchasePrice);
        if (sellingPrice !== undefined && sellingPrice !== '') stockItem.sellingPrice = Number(sellingPrice);
        if (expiryDate) stockItem.expiryDate = expiryDate;
        await stockItem.save();
      } else {
        stockItem = await Stock.create({
          medicineId: existingCode._id,
          batchNumber: existingCode.batchNumber,
          currentQuantity: qtyNumber,
          purchasePrice: Number(purchasePrice || existingCode.purchasePrice || 0),
          sellingPrice: Number(sellingPrice || existingCode.sellingPrice || 0),
          expiryDate: expiryDate || existingCode.expiryDate,
          rackLocation: rackLocation || existingCode.rackLocation
        });
      }

      // Record Stock In Log
      await StockIn.create({
        medicineId: existingCode._id,
        batchNumber: existingCode.batchNumber,
        quantity: qtyNumber,
        purchasePrice: Number(purchasePrice || existingCode.purchasePrice || 0),
        invoiceNumber: existingCode.code,
        notes: notes || 'Restock / Stock In Batch Addition'
      });

      // Create Notification
      await Notification.create({
        type: 'system',
        title: 'Stock In Updated',
        message: `Added +${qtyNumber} units to ${existingCode.name}. Total stock: ${existingCode.quantity}.`
      });

      return res.json({ success: true, message: 'Stock quantity updated successfully', data: existingCode });
    }

    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

    const medicine = await Medicine.create({
      name: name.trim(),
      code: code || `MED-${Math.floor(100000 + Math.random() * 900000)}`,
      category: category || 'General',
      medicineType: medicineType || 'Tablet',
      activeIngredient: activeIngredient || name.trim().split(' ')[0],
      manufacturer: manufacturer || 'Generic',
      batchNumber: batchNumber || `BT-${Date.now().toString().slice(-4)}`,
      quantity: qtyNumber,
      minStockAlert: Number(minStockAlert || 15),
      purchasePrice: Number(purchasePrice || 0),
      sellingPrice: Number(sellingPrice || 0),
      expiryDate: expiryDate || defaultExpiry,
      rackLocation: rackLocation || 'Shelf A1',
      requiresPrescription: Boolean(requiresPrescription)
    });

    // Create Stock Item
    await Stock.create({
      medicineId: medicine._id,
      batchNumber: medicine.batchNumber,
      currentQuantity: qtyNumber,
      purchasePrice: Number(purchasePrice || 0),
      sellingPrice: Number(sellingPrice || 0),
      expiryDate: medicine.expiryDate,
      rackLocation: medicine.rackLocation
    });

    // Record Stock In Log
    await StockIn.create({
      medicineId: medicine._id,
      batchNumber: medicine.batchNumber,
      quantity: qtyNumber,
      purchasePrice: Number(purchasePrice || 0),
      invoiceNumber: medicine.code,
      notes: notes || 'Initial New Product Stock In'
    });

    await Notification.create({
      type: 'system',
      title: 'New Stock Added',
      message: `Added new medicine ${medicine.name} (Batch: ${medicine.batchNumber}, Qty: ${medicine.quantity}).`
    });

    res.status(201).json({ success: true, message: 'Medicine batch created', data: medicine });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Edit Medicine details
const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!medicine) return res.status(404).json({ success: false, error: 'Medicine not found' });
    
    // Also sync the stock items
    await Stock.findOneAndUpdate(
      { medicineId: medicine._id, batchNumber: medicine.batchNumber },
      { 
        currentQuantity: medicine.quantity,
        purchasePrice: medicine.purchasePrice,
        sellingPrice: medicine.sellingPrice,
        expiryDate: medicine.expiryDate,
        rackLocation: medicine.rackLocation
      }
    );

    res.json({ success: true, data: medicine });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete Medicine
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, error: 'Medicine not found' });
    
    // Delete corresponding stock records too
    await Stock.deleteMany({ medicineId: medicine._id });

    res.json({ success: true, message: 'Medicine removed from database' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Manual Stock Out
const manualStockOut = async (req, res) => {
  try {
    const { quantity, reason } = req.body;
    const qtyDeduct = Number(quantity);

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'Medicine not found' });
    }

    if (medicine.quantity < qtyDeduct) {
      return res.status(400).json({ success: false, error: `Insufficient stock! Current stock: ${medicine.quantity}` });
    }

    medicine.quantity -= qtyDeduct;
    await medicine.save();

    // Deduct from stock item
    const stockItem = await Stock.findOne({ medicineId: medicine._id, batchNumber: medicine.batchNumber });
    if (stockItem) {
      stockItem.currentQuantity = Math.max(0, stockItem.currentQuantity - qtyDeduct);
      await stockItem.save();
    }

    const isExpiredDisposal = (reason || '').toLowerCase().includes('expired');

    // Create StockOut record
    await StockOut.create({
      medicineId: medicine._id,
      batchNumber: medicine.batchNumber,
      quantity: qtyDeduct,
      transactionType: isExpiredDisposal ? 'EXPIRED_OUT' : 'MANUAL_OUT',
      reason: reason || 'Manual Stock Adjustment',
      referenceId: `ADJ-${Date.now().toString().slice(-5)}`
    });

    if (isExpiredDisposal) {
      await ExpiryNotification.create({
        medicineId: medicine._id,
        medicineName: medicine.name,
        batchNumber: medicine.batchNumber,
        expiryDate: medicine.expiryDate,
        daysRemaining: 0,
        status: 'Disposed'
      });
    }

    await Notification.create({
      type: 'system',
      title: 'Manual Stock Out',
      message: `Removed ${qtyDeduct} units of ${medicine.name}. Reason: ${reason || 'Manual Adjustment'}.`
    });

    res.json({ success: true, message: 'Stock out processed successfully', data: medicine });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get Category list
const getCategories = async (req, res) => {
  try {
    const categories = await MedicineCategory.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add Category
const addCategory = async (req, res) => {
  try {
    const category = await MedicineCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get MedicineTypes list
const getTypes = async (req, res) => {
  try {
    const types = await MedicineType.find().sort({ name: 1 });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add MedicineType
const addType = async (req, res) => {
  try {
    const type = await MedicineType.create(req.body);
    res.status(201).json({ success: true, data: type });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Manual Stock In (Add stock to existing medicine batch)
const manualStockIn = async (req, res) => {
  try {
    const { quantity, batchNumber, purchasePrice, sellingPrice, expiryDate, supplierName, reason } = req.body;
    const qtyAdd = Number(quantity);

    if (!qtyAdd || qtyAdd <= 0) {
      return res.status(400).json({ success: false, error: 'Valid positive quantity is required.' });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'Medicine not found' });
    }

    medicine.quantity += qtyAdd;
    if (batchNumber) medicine.batchNumber = batchNumber;
    if (purchasePrice) medicine.purchasePrice = Number(purchasePrice);
    if (sellingPrice) medicine.sellingPrice = Number(sellingPrice);
    if (expiryDate) medicine.expiryDate = expiryDate;
    await medicine.save();

    // Upsert Stock Item
    let stockItem = await Stock.findOne({ medicineId: medicine._id, batchNumber: medicine.batchNumber });
    if (stockItem) {
      stockItem.currentQuantity += qtyAdd;
      if (purchasePrice) stockItem.purchasePrice = Number(purchasePrice);
      if (sellingPrice) stockItem.sellingPrice = Number(sellingPrice);
      if (expiryDate) stockItem.expiryDate = expiryDate;
      await stockItem.save();
    } else {
      stockItem = await Stock.create({
        medicineId: medicine._id,
        batchNumber: medicine.batchNumber,
        currentQuantity: qtyAdd,
        purchasePrice: medicine.purchasePrice,
        sellingPrice: medicine.sellingPrice,
        expiryDate: medicine.expiryDate,
        rackLocation: medicine.rackLocation
      });
    }

    // Record Stock In Log
    await StockIn.create({
      medicineId: medicine._id,
      batchNumber: medicine.batchNumber,
      quantity: qtyAdd,
      purchasePrice: medicine.purchasePrice,
      invoiceNumber: `STKIN-${Date.now().toString().slice(-5)}`,
      notes: reason || (supplierName ? `Stock In from Supplier: ${supplierName}` : 'Manual Stock Addition')
    });

    await Notification.create({
      type: 'system',
      title: 'Manual Stock In',
      message: `Added +${qtyAdd} units to ${medicine.name} (Batch: ${medicine.batchNumber}). Total stock: ${medicine.quantity}.`
    });

    res.json({ success: true, message: 'Stock added successfully', data: medicine });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getMedicines,
  getAlternates,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  manualStockOut,
  manualStockIn,
  getCategories,
  addCategory,
  getTypes,
  addType
};

