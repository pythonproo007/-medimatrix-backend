const HomeDelivery = require('../models/HomeDelivery');
const Sale = require('../models/Sale');
const Notification = require('../models/Notification');

const getHomeDeliveries = async (req, res) => {
  try {
    const deliveries = await HomeDelivery.find().populate('saleId', 'invoiceNo grandTotal paymentMethod').sort({ createdAt: -1 });
    res.json({ success: true, count: deliveries.length, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryStatus, deliveryBoyName, deliveryBoyPhone } = req.body;
    const delivery = await HomeDelivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery record not found' });

    delivery.deliveryStatus = deliveryStatus;
    if (deliveryBoyName) delivery.deliveryBoyName = deliveryBoyName;
    if (deliveryBoyPhone) delivery.deliveryBoyPhone = deliveryBoyPhone;

    if (deliveryStatus === 'Out for Delivery') {
      delivery.dispatchedAt = new Date();
    } else if (deliveryStatus === 'Delivered') {
      delivery.deliveredAt = new Date();
    }
    await delivery.save();

    // Sync back to Sale header status for consistency
    const sale = await Sale.findById(delivery.saleId);
    if (sale) {
      sale.deliveryStatus = deliveryStatus;
      await sale.save();
    }

    await Notification.create({
      type: 'system',
      title: 'Home Delivery Updated',
      message: `Delivery status for invoice ${delivery.invoiceNo} changed to "${deliveryStatus}".`
    });

    res.json({ success: true, message: `Delivery status updated to ${deliveryStatus}`, data: delivery });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getHomeDeliveries,
  updateDeliveryStatus
};
