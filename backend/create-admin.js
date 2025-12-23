// Usage: node create-admin.js
import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js'; // adjust path if needed

const run = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_crm_lk';
  await mongoose.connect(uri);

  const email = 'admin@erp.lk';
  const exists = await User.findOne({ email });

  if (exists) {
    console.log('✅ Admin already exists:', email);
    process.exit(0);
  }

  // IMPORTANT: your User model hashes password automatically (pre-save hook)
  await User.create({
    email,
    password: 'admin123',
    firstName: 'normal',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  });

  console.log('✅ admin created');
  console.log('Email:', email);
  console.log('Password: user123');
  process.exit(0);
};

run().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
