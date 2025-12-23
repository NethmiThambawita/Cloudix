import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_crm_lk');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_crm_lk');
    console.log('✅ Connected to MongoDB\n');
    
    // Define schemas inline
    const UserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      firstName: String,
      lastName: String,
      role: String,
      phone: String,
      isActive: Boolean,
      lastLogin: Date
    }, { timestamps: true });
    
    const CompanySchema = new mongoose.Schema({
      name: String,
      address: String,
      phone: String,
      email: String,
      taxNumber: String,
      currency: String,
      currencySymbol: String,
      prefixes: Object
    }, { timestamps: true });
    
    const SequenceSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      value: { type: Number, default: 0 },
      prefix: String
    });

    const TaxSchema = new mongoose.Schema({
      name: { type: String, required: true },
      value: { type: Number, required: true, min: 0, max: 100 },
      isDefault: { type: Boolean, default: false },
      enabled: { type: Boolean, default: true }
    }, { timestamps: true });
    
    // Get or create models
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
    const Sequence = mongoose.models.Sequence || mongoose.model('Sequence', SequenceSchema);
    const Tax = mongoose.models.Tax || mongoose.model('Tax', TaxSchema);
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Sequence.deleteMany({});
    await Tax.deleteMany({});
    console.log('✅ Data cleared\n');
    
    // Create admin user with hashed password
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await User.create({
      email: 'admin@erp.lk',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      phone: '+94 77 123 4567',
      isActive: true
    });
    console.log('✅ Admin user created');
    
    // Create company
    console.log('🏢 Creating company...');
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
    console.log('✅ Company created');
    
    // Initialize Sequences
    console.log('📋 Creating sequences...');
    await Sequence.create([
      { name: 'customer', value: 0, prefix: 'CUST-' },
      { name: 'quotation', value: 0, prefix: 'SQ-' },
      { name: 'invoice', value: 0, prefix: 'SI-' },
      { name: 'payment', value: 0, prefix: 'PAY-' }
    ]);
    console.log('✅ Sequences created\n');

    // Create default taxes (so dropdown is populated immediately)
    console.log('💸 Creating default taxes...');
    await Tax.create([
      { name: 'VAT', value: 18, isDefault: true, enabled: true },
      { name: 'NBT', value: 2.5, isDefault: false, enabled: true }
    ]);
    console.log('✅ Taxes created\n');
    
    console.log('═══════════════════════════════════════════');
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📧 LOGIN CREDENTIALS:');
    console.log('   Email: admin@erp.lk');
    console.log('   Password: admin123');
    console.log('\n🇱🇰 SYSTEM SETTINGS:');
    console.log('   Currency: LKR (Sri Lankan Rupees)');
    console.log('   Symbol: Rs.');
    console.log('\n📋 DOCUMENT PREFIXES:');
    console.log('   Quotations: SQ-');
    console.log('   Purchase Orders: PO-');
    console.log('   Invoices: SI-');
    console.log('   Payments: PAY-');
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. npm run dev (start backend)');
    console.log('   2. Open new terminal: cd frontend && npm run dev');
    console.log('   3. Open http://localhost:3000');
    console.log('   4. Login with admin@erp.lk / admin123\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Is MongoDB running? Check: http://localhost:27017');
    console.error('   2. Is the MONGODB_URI correct in .env?');
    console.error('   3. Try starting MongoDB:');
    console.error('      - Windows: Start MongoDB service');
    console.error('      - Mac: brew services start mongodb-community');
    console.error('      - Linux: sudo systemctl start mongod');
    console.error('\n');
    process.exit(1);
  }
};

seedDatabase();