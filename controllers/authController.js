const User = require('../models/User');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const Doctor = require('../models/Doctor');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username/Email and password are required' });
    }

    const cleanInput = username.trim();
    const user = await User.findOne({
      $or: [
        { username: new RegExp('^' + cleanInput + '$', 'i') },
        { email: new RegExp('^' + cleanInput + '$', 'i') }
      ]
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid username/email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username/email or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'medimatrix_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const register = async (req, res) => {
  try {
    const { username, password, email, role, fullName, phone, registrationNumber, clinicHospital, position, salary } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    const user = await User.create({
      username,
      password,
      email,
      role: role || 'employee'
    });

    if (user.role === 'admin') {
      await Admin.create({
        userId: user._id,
        fullName: fullName || username,
        permissions: ['manage_users', 'manage_stock', 'view_reports', 'pos_billing']
      });
    } else if (user.role === 'doctor') {
      await Doctor.create({
        userId: user._id,
        name: fullName || username,
        registrationNumber: registrationNumber || `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
        clinicHospital: clinicHospital || 'City Clinic',
        phone: phone || ''
      });
    } else {
      await Employee.create({
        userId: user._id,
        name: fullName || username,
        phone: phone || '0000000000',
        email: email,
        position: position || 'Pharmacist',
        salary: Number(salary || 15000)
      });
    }

    res.status(201).json({
      success: true,
      message: `User registered successfully as ${user.role}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { email, fullName, password, phone, registrationNumber, clinicHospital, position, salary } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (email) user.email = email;
    if (password) user.password = password; // pre-save hook will hash it
    await user.save();

    if (user.role === 'admin') {
      await Admin.findOneAndUpdate(
        { userId: user._id },
        { fullName: fullName || user.username },
        { upsert: true }
      );
    } else if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { userId: user._id },
        {
          name: fullName || user.username,
          phone: phone || '',
          registrationNumber: registrationNumber || '',
          clinicHospital: clinicHospital || ''
        },
        { upsert: true }
      );
    } else {
      await Employee.findOneAndUpdate(
        { userId: user._id },
        {
          name: fullName || user.username,
          phone: phone || '',
          email: email || user.email,
          position: position || 'Pharmacist',
          salary: Number(salary || 15000)
        },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { username, email, newPassword } = req.body;
    if (!username || !email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Username, email, and new password are required' });
    }

    const user = await User.findOne({ username, email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found matching these credentials' });
    }

    user.password = newPassword; // pre-save hashes it
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { login, register, getMe, updateProfile, forgotPassword };

