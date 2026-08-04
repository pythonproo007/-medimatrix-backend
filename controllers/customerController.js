const Customer = require('../models/Customer');
const Feedback = require('../models/Feedback');

const getCustomers = async (req, res) => {
  try {
    const { search, regularOnly } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (regularOnly === 'true') {
      query.isRegular = true;
    }

    const customers = await Customer.find(query).sort({ totalSpent: -1 });
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const toggleRegularStatus = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    customer.isRegular = !customer.isRegular;
    if (customer.isRegular) {
      customer.discountRate = 10; // Default regular customer discount
    } else {
      customer.discountRate = 0;
    }
    await customer.save();

    res.json({ success: true, message: `Customer regular status set to ${customer.isRegular}`, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, message: 'Customer profile deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Feedback API (linked to Customer)
const submitFeedback = async (req, res) => {
  try {
    const { name, email, phone, rating, comments, customerId } = req.body;
    const feedback = await Feedback.create({
      customerId: customerId || null,
      name: name || 'Walk-in Customer',
      email: email || '',
      phone: phone || '',
      rating: Number(rating),
      comments
    });
    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json({ success: true, data: feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const Sale = require('../models/Sale');
const Prescription = require('../models/Prescription');

const getCustomerHistory = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer profile not found' });
    }

    const sales = await Sale.find({
      $or: [
        { customerId: customer._id },
        { customerPhone: customer.phone }
      ]
    }).sort({ createdAt: -1 });

    const prescriptions = await Prescription.find({
      $or: [
        { customerId: customer._id },
        { patientPhone: customer.phone },
        { patientName: { $regex: customer.name, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        customer,
        sales,
        prescriptions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  toggleRegularStatus,
  deleteCustomer,
  getCustomerHistory,
  submitFeedback,
  getFeedbacks
};

