import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Sequence from '../models/Sequence.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Sequence.deleteMany({});

    // Create Admin User
    await User.create({
      email: 'admin@erp.lk',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      phone: '+94 77 123 4567'
    });

    // Create Company
    await Company.create({
      name: process.env.COMPANY_NAME || 'Your Company (Pvt) Ltd',
      address: process.env.COMPANY_ADDRESS || 'Colombo, Sri Lanka',
      phone: process.env.COMPANY_PHONE || '+94 11 234 5678',
      email: process.env.COMPANY_EMAIL || 'info@yourcompany.lk',
      taxNumber: process.env.COMPANY_TAX_NUMBER || 'VAT123456789',
      currency: 'LKR',
      currencySymbol: 'Rs.',
      prefixes: {
        quotation: 'SQ-',
        purchaseOrder: 'PO-',
        invoice: 'SI-',
        payment: 'PAY-'
      }
    });

    // Initialize Sequences
    await Sequence.create([
      { type: 'customer', current: 0, prefix: 'CUST-' },
      { type: 'quotation', current: 0, prefix: 'SQ-' },
      { type: 'invoice', current: 0, prefix: 'SI-' },
      { type: 'payment', current: 0, prefix: 'PAY-' }
    ]);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('Email: admin@erp.lk');
    console.log('Password: admin123');
    console.log('\n💰 Currency: LKR (Sri Lankan Rupees)');
    console.log('💼 Document Prefixes: SQ-, PO-, SI-, PAY-\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedDatabase();
