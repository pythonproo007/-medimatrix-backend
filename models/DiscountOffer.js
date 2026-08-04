const mongoose = require('mongoose');

const DiscountOfferSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  description: { type: String, default: '' },
  targetAudience: { type: String, enum: ['all', 'regular'], default: 'regular' },
  validTill: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiscountOffer', DiscountOfferSchema);
