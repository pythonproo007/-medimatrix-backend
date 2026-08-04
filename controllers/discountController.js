const DiscountOffer = require('../models/DiscountOffer');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');

const getOffers = async (req, res) => {
  try {
    const offers = await DiscountOffer.find().sort({ createdAt: -1 });
    res.json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createOffer = async (req, res) => {
  try {
    const { title, code, discountPercentage, description, targetAudience, validTill, broadcastNow } = req.body;
    
    const offer = await DiscountOffer.create({
      title,
      code: code.trim().toUpperCase(),
      discountPercentage: Number(discountPercentage),
      description: description || '',
      targetAudience: targetAudience || 'regular',
      validTill: new Date(validTill)
    });

    if (broadcastNow) {
      const targetQuery = offer.targetAudience === 'regular' ? { isRegular: true } : {};
      const customers = await Customer.find(targetQuery);
      
      for (let cust of customers) {
        await Notification.create({
          type: 'discount_offer',
          title: `Special Offer: ${offer.title} (${offer.discountPercentage}% OFF)`,
          message: `Hello ${cust.name}! Use promo code ${offer.code} to get ${offer.discountPercentage}% OFF on your next purchase! Valid till ${new Date(offer.validTill).toLocaleDateString()}.`,
          recipientPhone: cust.phone,
          recipientName: cust.name
        });
      }
    }

    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const validateOffer = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Promo code is required.' });

    const offer = await DiscountOffer.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Invalid or inactive promo code.' });
    }

    if (new Date(offer.validTill) < new Date()) {
      return res.status(400).json({ success: false, error: 'Promo code has expired.' });
    }

    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const broadcastOffer = async (req, res) => {
  try {
    const offer = await DiscountOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });

    const targetQuery = offer.targetAudience === 'regular' ? { isRegular: true } : {};
    const customers = await Customer.find(targetQuery);

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No target customers found to receive broadcast notifications.'
      });
    }

    const notifications = [];
    for (let cust of customers) {
      const notif = await Notification.create({
        type: 'discount_offer',
        title: `Special Offer: ${offer.title} (${offer.discountPercentage}% OFF)`,
        message: `Hello ${cust.name}! Use promo code ${offer.code} to get ${offer.discountPercentage}% OFF on your next purchase! Valid till ${new Date(offer.validTill).toLocaleDateString()}.`,
        recipientPhone: cust.phone,
        recipientName: cust.name
      });
      notifications.push(notif);
    }

    res.json({
      success: true,
      message: `Successfully broadcast offer "${offer.title}" to ${customers.length} customers!`,
      recipientCount: customers.length,
      notificationsSent: notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getOffers,
  createOffer,
  validateOffer,
  broadcastOffer
};
