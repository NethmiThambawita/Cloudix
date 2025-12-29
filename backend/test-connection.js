import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  console.log('🔍 Testing MongoDB Connection...\n');
  console.log('Connection String:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
  console.log('Database Name:', process.env.MONGODB_URI.split('/').pop());
  console.log('\nAttempting to connect...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Connection State:', mongoose.connection.readyState);
    console.log('🗄️  Database:', mongoose.connection.db.databaseName);
    console.log('🌐 Host:', mongoose.connection.host);

    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection Failed!\n');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);

    if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔍 DNS Resolution failed - Check your internet connection');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('\n🔍 Connection timeout - Possible firewall blocking port 27017');
    } else if (error.message.includes('Authentication failed')) {
      console.error('\n🔍 Invalid username or password');
    } else if (error.message.includes('IP')) {
      console.error('\n🔍 IP not whitelisted - Wait 1-2 minutes after adding IP');
    }

    console.error('\n📋 Full error details:');
    console.error(error);

    process.exit(1);
  }
};

testConnection();
