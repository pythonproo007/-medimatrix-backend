const mongoose = require('mongoose');

// Globally disable command buffering so queries fail fast if DB is disconnected
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medical_shop';
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      bufferTimeoutMS: 3000,
      family: 4
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MongoDB at ${mongoURI}: ${error.message}`);
    console.warn(`[Database Warning] Please ensure MongoDB daemon (mongod) is running.`);
    return false;
  }
};

mongoose.connection.on('error', (err) => {
  console.error(`[Database Error] Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Mongoose disconnected from MongoDB.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] Mongoose reconnected to MongoDB.');
});

module.exports = connectDB;
