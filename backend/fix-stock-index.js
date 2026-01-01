import mongoose from 'mongoose';
import 'dotenv/config';

// Script to fix the stock index issue
// This removes the old product_1 index that prevents multiple locations

async function fixStockIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('stocks');

    // Get all current indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    // Check if the problematic index exists
    const hasOldIndex = indexes.some(idx => idx.name === 'product_1');

    if (hasOldIndex) {
      console.log('\n🗑️  Dropping old product_1 index...');
      await collection.dropIndex('product_1');
      console.log('✅ Old index dropped successfully!');
    } else {
      console.log('\n✅ Old product_1 index not found (already removed or never existed)');
    }

    // Verify the correct compound index exists
    const hasCompoundIndex = indexes.some(
      idx => idx.name === 'product_1_location_1' ||
             (idx.key.product && idx.key.location)
    );

    if (!hasCompoundIndex) {
      console.log('\n⚠️  Warning: Compound index {product, location} not found!');
      console.log('Creating compound index...');
      await collection.createIndex(
        { product: 1, location: 1 },
        { unique: true, name: 'product_1_location_1' }
      );
      console.log('✅ Compound index created!');
    } else {
      console.log('✅ Compound index {product, location} exists');
    }

    // Show final state
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    console.log('\n✅ Index fix completed successfully!');
    console.log('You can now transfer stock between locations.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fixing indexes:', error.message);
    process.exit(1);
  }
}

fixStockIndex();
