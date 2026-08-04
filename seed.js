const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load Models
const User = require('./models/User');
const Admin = require('./models/Admin');
const Customer = require('./models/Customer');
const Doctor = require('./models/Doctor');
const Employee = require('./models/Employee');
const Supplier = require('./models/Supplier');
const Company = require('./models/Company');
const MedicineCategory = require('./models/MedicineCategory');
const MedicineType = require('./models/MedicineType');
const Medicine = require('./models/Medicine');
const Stock = require('./models/Stock');
const StockIn = require('./models/StockIn');
const Prescription = require('./models/Prescription');
const DiscountOffer = require('./models/DiscountOffer');
const Notification = require('./models/Notification');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    console.log('[Seed] Clearing existing collections...');
    const collections = Object.keys(mongoose.connection.collections);
    for (const name of collections) {
      await mongoose.connection.collections[name].deleteMany({});
    }
    console.log('[Seed] Collections cleared.');

    // 1. Create Default Users
    console.log('[Seed] Creating default users...');
    const adminUser = await User.create({
      username: 'admin',
      password: 'admin123', // Will be hashed via pre-save hook
      email: 'admin@medimatrix.com',
      role: 'admin'
    });

    await Admin.create({
      userId: adminUser._id,
      fullName: 'Super Administrator',
      permissions: ['all']
    });

    const doctorUser = await User.create({
      username: 'doctor',
      password: 'doctor123',
      email: 'dr.smith@medimatrix.com',
      role: 'doctor'
    });

    const doctor = await Doctor.create({
      userId: doctorUser._id,
      name: 'Dr. Gregory Smith',
      registrationNumber: 'DOC-REG-9941',
      clinicHospital: 'City General Health Care',
      specialty: 'Internal Medicine',
      phone: '+1 555-0199'
    });

    const employeeUser = await User.create({
      username: 'employee',
      password: 'employee123',
      email: 'johndoe@medimatrix.com',
      role: 'employee'
    });

    await Employee.create({
      userId: employeeUser._id,
      name: 'John Doe',
      phone: '+1 555-0122',
      email: 'johndoe@medimatrix.com',
      position: 'Senior Pharmacist',
      salary: 22000
    });

    console.log('[Seed] User accounts seeded (admin/admin123, doctor/doctor123, employee/employee123).');

    // 2. Seed Categories, Types, and Manufacturers
    console.log('[Seed] Seeding metadata...');
    const categories = ['Antibiotics', 'Analgesic / Antipyretic', 'Syrup / Respiratory', 'Antidiabetic', 'Cardiovascular', 'Vitamins & Supplements', 'First Aid & Ointments'];
    const categoryDocs = [];
    for (let c of categories) {
      const doc = await MedicineCategory.create({ name: c, description: `${c} drugs classification` });
      categoryDocs.push(doc);
    }

    const types = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Eye/Ear Drops', 'Supplement'];
    const typeDocs = [];
    for (let t of types) {
      const doc = await MedicineType.create({ name: t, description: `${t} medicine unit type` });
      typeDocs.push(doc);
    }

    const companies = ['Sun Pharma', 'Micro Labs', 'Cipla Ltd', 'Johnson & Johnson', 'Dr. Reddy\'s', 'Lupin Pharma', 'Abbott Healthcare', 'Alcon Lab'];
    const companyDocs = [];
    for (let comp of companies) {
      const doc = await Company.create({ name: comp, contactNumber: '+1 800-555-0100', address: 'Pharmaceutical Industrial Zone' });
      companyDocs.push(doc);
    }

    // Seed a Supplier
    const supplier = await Supplier.create({
      name: 'Global Pharma Distributors',
      contactPerson: 'Sarah Jenkins',
      phone: '+1 555-0988',
      email: 'orders@globalpharma.com',
      address: '90 Warehouse Ave, Industrial Park'
    });

    // 3. Seed Medicines
    console.log('[Seed] Seeding medicines...');
    const sampleMedicines = [
      {
        name: 'Amoxicillin 500mg Capsules',
        code: 'MED-1001',
        category: 'Antibiotics',
        medicineType: 'Capsule',
        activeIngredient: 'Amoxicillin',
        manufacturer: 'Sun Pharma',
        batchNumber: 'BT-2024-01',
        quantity: 120,
        minStockAlert: 20,
        purchasePrice: 12.00,
        sellingPrice: 18.50,
        expiryDate: new Date('2027-08-15'),
        rackLocation: 'Rack A-1',
        requiresPrescription: true
      },
      {
        name: 'Paracetamol 650mg (Dolo Tablets)',
        code: 'MED-1002',
        category: 'Analgesic / Antipyretic',
        medicineType: 'Tablet',
        activeIngredient: 'Paracetamol',
        manufacturer: 'Micro Labs',
        batchNumber: 'BT-2024-09',
        quantity: 8, // Low stock trigger
        minStockAlert: 30,
        purchasePrice: 2.00,
        sellingPrice: 4.00,
        expiryDate: new Date('2026-11-20'),
        rackLocation: 'Rack B-3',
        requiresPrescription: false
      },
      {
        name: 'Azithromycin 250mg Tablets',
        code: 'MED-1003',
        category: 'Antibiotics',
        medicineType: 'Tablet',
        activeIngredient: 'Azithromycin',
        manufacturer: 'Cipla Ltd',
        batchNumber: 'BT-2023-88',
        quantity: 45,
        minStockAlert: 15,
        purchasePrice: 45.00,
        sellingPrice: 70.00,
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Expiring in 15 days!
        rackLocation: 'Rack A-2',
        requiresPrescription: true
      },
      {
        name: 'Benadryl Cough Syrup 100ml',
        code: 'MED-1004',
        category: 'Syrup / Respiratory',
        medicineType: 'Syrup',
        activeIngredient: 'Diphenhydramine',
        manufacturer: 'Johnson & Johnson',
        batchNumber: 'BT-2023-11',
        quantity: 25,
        minStockAlert: 10,
        purchasePrice: 85.00,
        sellingPrice: 110.00,
        expiryDate: new Date('2024-01-10'), // Already Expired!
        rackLocation: 'Rack C-1',
        requiresPrescription: false
      },
      {
        name: 'Metformin 500mg Tablets',
        code: 'MED-1005',
        category: 'Antidiabetic',
        medicineType: 'Tablet',
        activeIngredient: 'Metformin',
        manufacturer: 'Dr. Reddy\'s',
        batchNumber: 'BT-2024-44',
        quantity: 200,
        minStockAlert: 50,
        purchasePrice: 3.50,
        sellingPrice: 6.00,
        expiryDate: new Date('2028-02-28'),
        rackLocation: 'Rack D-2',
        requiresPrescription: true
      },
      {
        name: 'Atorvastatin 10mg Tablets',
        code: 'MED-1006',
        category: 'Cardiovascular',
        medicineType: 'Tablet',
        activeIngredient: 'Atorvastatin',
        manufacturer: 'Lupin Pharma',
        batchNumber: 'BT-2024-77',
        quantity: 5,
        minStockAlert: 20,
        purchasePrice: 15.00,
        sellingPrice: 24.00,
        expiryDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000), // Expiring soon
        rackLocation: 'Rack D-4',
        requiresPrescription: true
      }
    ];

    for (let m of sampleMedicines) {
      const med = await Medicine.create(m);
      
      // Seed initial Stock record
      await Stock.create({
        medicineId: med._id,
        batchNumber: med.batchNumber,
        currentQuantity: med.quantity,
        purchasePrice: med.purchasePrice,
        sellingPrice: med.sellingPrice,
        expiryDate: med.expiryDate,
        rackLocation: med.rackLocation
      });

      // Seed initial StockIn log
      await StockIn.create({
        medicineId: med._id,
        batchNumber: med.batchNumber,
        quantity: med.quantity,
        purchasePrice: med.purchasePrice,
        supplierId: supplier._id,
        invoiceNumber: 'INITIAL-STOCK',
        notes: 'Initial seed stock creation'
      });
    }

    // 4. Seed Customers
    console.log('[Seed] Seeding customers...');
    const sampleCustomers = [
      {
        name: 'Robert Davis',
        phone: '+1 9876543210',
        email: 'robert.davis@example.com',
        address: '42 Wallaby Way, Metro City',
        homeDeliveryAddress: '42 Wallaby Way, Apartment 4B, Metro City',
        visitsCount: 12,
        totalSpent: 450.00,
        isRegular: true,
        discountRate: 10,
        allergies: ['Sulfa'],
        medicalHistory: 'Hypertension, Diabetes Type 2'
      },
      {
        name: 'Sarah Connor',
        phone: '+1 9876543211',
        email: 'sarah.c@example.com',
        address: '742 Evergreen Terrace',
        homeDeliveryAddress: '742 Evergreen Terrace, Sector 7',
        visitsCount: 7,
        totalSpent: 280.00,
        isRegular: true,
        discountRate: 10,
        allergies: ['Amoxicillin', 'Penicillin'],
        medicalHistory: 'Severe allergy to Penicillin derivative antibiotics'
      },
      {
        name: 'Michael Scott',
        phone: '+1 9876543212',
        email: 'm.scott@dundermifflin.com',
        address: 'Scranton, PA',
        homeDeliveryAddress: '1725 Slough Avenue, Scranton, PA',
        visitsCount: 1,
        totalSpent: 25.50,
        isRegular: false,
        discountRate: 0,
        allergies: ['Aspirin'],
        medicalHistory: 'Mild headache reports'
      }
    ];

    for (let c of sampleCustomers) {
      await Customer.create(c);
    }

    // 5. Seed Discount Offers
    console.log('[Seed] Seeding offers...');
    await DiscountOffer.create({
      title: 'Monsoon Immunity Booster Fest',
      code: 'IMMUNITY20',
      discountPercentage: 20,
      description: 'Get 20% discount on vitamins and healthcare supplements.',
      targetAudience: 'all',
      validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await DiscountOffer.create({
      title: 'Regular Premium Member Reward',
      code: 'MEDICARE15',
      discountPercentage: 15,
      description: 'Exclusive 15% discount for regular pharmacy customers.',
      targetAudience: 'regular',
      validTill: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });

    // 6. Seed Prescriptions
    console.log('[Seed] Seeding prescriptions...');
    const amox = await Medicine.findOne({ code: 'MED-1001' });
    const azith = await Medicine.findOne({ code: 'MED-1003' });

    await Prescription.create({
      prescriptionNo: 'RX-908172',
      doctorId: doctor._id,
      doctorName: doctor.name,
      doctorRegNo: doctor.registrationNumber,
      clinicHospital: doctor.clinicHospital,
      patientName: 'Sarah Connor',
      patientPhone: '+1 9876543211',
      items: [
        {
          medicineId: amox ? amox._id : null,
          medicineName: amox ? amox.name : 'Amoxicillin 500mg Capsules',
          quantity: 15,
          dosage: '1 capsule three times daily',
          duration: '5 days',
          fulfilled: false
        }
      ],
      status: 'Pending',
      notes: 'Take after food. Avoid milk. Patient allergic to penicillin derivatives, verify alternate if needed!'
    });

    await Prescription.create({
      prescriptionNo: 'RX-884176',
      doctorId: doctor._id,
      doctorName: doctor.name,
      doctorRegNo: doctor.registrationNumber,
      clinicHospital: doctor.clinicHospital,
      patientName: 'Robert Davis',
      patientPhone: '+1 9876543210',
      items: [
        {
          medicineId: azith ? azith._id : null,
          medicineName: azith ? azith.name : 'Azithromycin 250mg Tablets',
          quantity: 6,
          dosage: '1 tablet once daily',
          duration: '6 days',
          fulfilled: false
        }
      ],
      status: 'Pending',
      notes: 'Verify with patient history.'
    });

    // System notifications
    await Notification.create({
      type: 'system',
      title: 'System Restructure Complete',
      message: 'MediMatrix databases and system modules separated successfully. Seed initialization loaded.'
    });

    console.log('[Seed] Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
    process.exit(1);
  }
};

seedData();
