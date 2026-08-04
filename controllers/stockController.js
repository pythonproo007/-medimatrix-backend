const Stock = require('../models/Stock');
const StockIn = require('../models/StockIn');
const StockOut = require('../models/StockOut');
const Medicine = require('../models/Medicine');

// Combined stock logs API
const getStockLogs = async (req, res) => {
  try {
    const { transactionType, search } = req.query;

    let inQuery = {};
    let outQuery = {};

    // Retrieve references populated to match medicine search
    let matchingMeds = [];
    if (search) {
      matchingMeds = await Medicine.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');
      const medIds = matchingMeds.map(m => m._id);
      inQuery.medicineId = { $in: medIds };
      outQuery.medicineId = { $in: medIds };
    }

    const [stockIns, stockOuts] = await Promise.all([
      StockIn.find(inQuery).populate('medicineId', 'name').populate('supplierId', 'name').sort({ receivedDate: -1 }),
      StockOut.find(outQuery).populate('medicineId', 'name').sort({ dispatchedDate: -1 })
    ]);

    // Map Stock In into uniform log format
    let logs = [];
    stockIns.forEach(item => {
      logs.push({
        _id: item._id,
        transactionType: item.invoiceNumber && item.invoiceNumber.startsWith('PO-') ? 'PURCHASE_IN' : 'STOCK_IN',
        medicineId: item.medicineId ? item.medicineId._id : null,
        medicineName: item.medicineId ? item.medicineId.name : 'Unknown Medicine',
        batchNumber: item.batchNumber,
        quantityChange: item.quantity,
        previousQuantity: 0, // Fallback for client
        newQuantity: item.quantity, // Fallback for client
        reason: item.notes || 'Supplier Purchase Intake',
        referenceId: item.invoiceNumber || '',
        createdAt: item.receivedDate
      });
    });

    // Map Stock Out into uniform log format
    stockOuts.forEach(item => {
      logs.push({
        _id: item._id,
        transactionType: item.transactionType || 'MANUAL_OUT',
        medicineId: item.medicineId ? item.medicineId._id : null,
        medicineName: item.medicineId ? item.medicineId.name : 'Unknown Medicine',
        batchNumber: item.batchNumber,
        quantityChange: -item.quantity,
        previousQuantity: 0,
        newQuantity: 0,
        reason: item.reason || 'Inventory movement out',
        referenceId: item.referenceId || '',
        createdAt: item.dispatchedDate
      });
    });

    // Sort combined list descending by date
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Filter by transactionType if queried
    if (transactionType) {
      logs = logs.filter(log => log.transactionType === transactionType);
    }

    res.json({ success: true, count: logs.length, data: logs.slice(0, 200) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStockLevels = async (req, res) => {
  try {
    const stock = await Stock.find().populate('medicineId', 'name code category medicineType');
    res.json({ success: true, count: stock.length, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getStockLogs, getStockLevels };
