import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('\n🔍 Troubleshooting steps:');
    console.error('1. Check your internet connection');
    console.error('2. Verify MongoDB Atlas cluster is running (not paused)');
    console.error('3. Check IP whitelist in MongoDB Atlas (Network Access)');
    console.error('4. Verify the connection string in .env file');
    console.error('5. Check if your network/firewall blocks MongoDB port 27017');
    console.error('\n⚠️  Server running WITHOUT database connection\n');
    // Don't exit - allow server to run for frontend development
  }
};

export default connectDB;