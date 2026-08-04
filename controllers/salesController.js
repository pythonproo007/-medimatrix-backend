const Sale = require('../models/Sale');
const SaleDetails = require('../models/SaleDetails');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const Prescription = require('../models/Prescription');
const Purchase = require('../models/Purchase');
const Stock = require('../models/Stock');
const StockOut = require('../models/StockOut');
const Payment = require('../models/Payment');
const HomeDelivery = require('../models/HomeDelivery');
const Notification = require('../models/Notification');
const DiscountOffer = require('../models/DiscountOffer');
const LowStockNotification = require('../models/LowStockNotification');

const getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const now = new Date();
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [
      totalMedicines,
      medicinesList,
      totalCustomers,
      regularCustomers,
      pendingPrescriptions,
      todaySalesList,
      totalPurchasesCount,
      pendingDeliveriesCount,
      stockOutLogsCount
    ] = await Promise.all([
      Medicine.countDocuments(),
      Medicine.find(),
      Customer.countDocuments(),
      Customer.countDocuments({ isRegular: true }),
      Prescription.countDocuments({ status: 'Pending' }),
      Sale.find({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Purchase.countDocuments(),
      Sale.countDocuments({ isHomeDelivery: true, deliveryStatus: { $in: ['Pending', 'Out for Delivery'] } }),
      StockOut.countDocuments()
    ]);

    let lowStockCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    medicinesList.forEach(item => {
      if (item.quantity <= item.minStockAlert) {
        lowStockCount++;
      }
      const exp = new Date(item.expiryDate);
      if (exp < now) {
        expiredCount++;
        expiringSoonCount++;
      } else if (exp <= sixtyDaysLater) {
        expiringSoonCount++;
      }
    });

    const todaySalesRevenue = todaySalesList.reduce((acc, sale) => acc + sale.grandTotal, 0);

    res.json({
      success: true,
      data: {
        totalMedicines,
        lowStockCount,
        expiringSoonCount,
        expiredCount,
        totalCustomers,
        regularCustomers,
        pendingPrescriptions,
        todaySalesCount: todaySalesList.length,
        todaySalesRevenue,
        totalPurchasesCount,
        pendingDeliveriesCount,
        totalStockLogsCount: stockOutLogsCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, error: 'Sale record not found' });
    }
    const items = await SaleDetails.find({ saleId: sale._id });
    const saleObj = sale.toObject();
    saleObj.items = items;
    res.json({ success: true, data: saleObj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createSale = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      items,
      paymentMethod,
      doctorName,
      promoCode,
      isHomeDelivery,
      deliveryAddress
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cannot process sale with empty cart.' });
    }

    let subtotal = 0;
    const stockDeductions = [];

    // First validation loop
    for (let item of items) {
      const med = await Medicine.findById(item.medicineId);
      if (!med) {
        return res.status(404).json({ success: false, error: `Medicine not found: ${item.medicineName || item.medicineId}` });
      }

      const qtyNeeded = Number(item.quantity);
      if (med.quantity < qtyNeeded) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${med.name}! Available: ${med.quantity}, Requested: ${qtyNeeded}`
        });
      }

      subtotal += med.sellingPrice * qtyNeeded;
      stockDeductions.push({ med, qtyNeeded });
    }

    // Process customer profiles
    let customer = null;
    if (customerPhone) {
      customer = await Customer.findOne({ phone: customerPhone });
      if (!customer && customerName) {
        customer = await Customer.create({ name: customerName, phone: customerPhone });
      }
    }

    // Calculate regular customer discount
    let discountAmount = 0;
    let isRegularCustomerDiscountApplied = false;
    let appliedPromo = '';

    if (customer) {
      customer.visitsCount += 1;
      if (customer.visitsCount >= 3 || customer.totalSpent > 1000) {
        customer.isRegular = true;
        customer.discountRate = 10;
      }

      if (customer.isRegular) {
        discountAmount = Math.round(subtotal * 0.10);
        isRegularCustomerDiscountApplied = true;
      }
    }

    // Apply Promo Code if provided
    if (promoCode) {
      const offer = await DiscountOffer.findOne({ code: promoCode.toUpperCase(), isActive: true });
      if (offer && new Date(offer.validTill) >= new Date()) {
        const promoDiscount = Math.round(subtotal * (offer.discountPercentage / 100));
        if (promoDiscount > discountAmount) {
          discountAmount = promoDiscount;
          appliedPromo = offer.code;
        }
      }
    }

    const grandTotal = Math.max(0, subtotal - discountAmount);

    if (customer) {
      customer.totalSpent += grandTotal;
      await customer.save();
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

    // Create Sale Header
    const sale = await Sale.create({
      invoiceNo,
      customerId: customer ? customer._id : null,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      doctorName: doctorName || '',
      subtotal,
      totalDiscount: discountAmount,
      grandTotal,
      paymentMethod: paymentMethod || 'Cash',
      isRegularCustomerDiscountApplied,
      appliedPromoCode: appliedPromo,
      isHomeDelivery: Boolean(isHomeDelivery),
      deliveryAddress: deliveryAddress || '',
      deliveryStatus: isHomeDelivery ? 'Pending' : 'N/A'
    });

    const detailsRows = [];

    // Deduct stock and save details
    for (let d of stockDeductions) {
      const prevQty = d.med.quantity;
      d.med.quantity -= d.qtyNeeded;
      await d.med.save();

      // Update corresponding stock
      const stockItem = await Stock.findOne({ medicineId: d.med._id, batchNumber: d.med.batchNumber });
      if (stockItem) {
        stockItem.currentQuantity = Math.max(0, stockItem.currentQuantity - d.qtyNeeded);
        await stockItem.save();
      }

      // Create SaleDetails Row
      const detail = await SaleDetails.create({
        saleId: sale._id,
        medicineId: d.med._id,
        medicineName: d.med.name,
        batchNumber: d.med.batchNumber,
        quantity: d.qtyNeeded,
        unitPrice: d.med.sellingPrice,
        discount: 0,
        total: d.med.sellingPrice * d.qtyNeeded
      });

      detailsRows.push(detail);

      // Create StockOut Record
      await StockOut.create({
        medicineId: d.med._id,
        batchNumber: d.med.batchNumber,
        quantity: d.qtyNeeded,
        transactionType: 'SALE_AUTO_OUT',
        referenceId: invoiceNo,
        reason: 'POS Sale Checkout Auto Stock-Out'
      });

      // Fire low stock alerts
      if (d.med.quantity <= d.med.minStockAlert) {
        await Notification.create({
          type: 'low_stock',
          title: 'Low Stock Alert!',
          message: `Stock for ${d.med.name} is now ${d.med.quantity} (Below threshold of ${d.med.minStockAlert}).`
        });

        await LowStockNotification.create({
          medicineId: d.med._id,
          medicineName: d.med.name,
          currentQuantity: d.med.quantity,
          threshold: d.med.minStockAlert,
          status: 'Pending'
        });
      }
    }

    // Create Payment record
    await Payment.create({
      saleId: sale._id,
      customerId: customer ? customer._id : null,
      amount: grandTotal,
      paymentMethod: paymentMethod || 'Cash',
      paymentStatus: 'Completed',
      transactionId: `TXN-${Date.now().toString().slice(-6)}`
    });

    // Create HomeDelivery queue if toggled
    if (isHomeDelivery) {
      await HomeDelivery.create({
        saleId: sale._id,
        invoiceNo,
        customerId: customer ? customer._id : null,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        deliveryAddress: deliveryAddress || '',
        deliveryStatus: 'Pending',
        deliveryBoyName: 'Courier Service'
      });
    }

    // Return format matching vanilla js expectations
    const saleObject = sale.toObject();
    saleObject.items = detailsRows;

    res.status(201).json({
      success: true,
      message: `Sale processed! Stock updated automatically. Invoice: ${invoiceNo}`,
      data: saleObject
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getSales,
  getSaleById,
  createSale
};
