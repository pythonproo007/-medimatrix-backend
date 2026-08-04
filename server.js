const app = require('./app');
const connectDB = require('./config/db');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB().then((connected) => {
  if (connected) {
    console.log('[Server] Database connection verified.');
  } else {
    console.log('[Server Warning] Running with disconnected database state.');
  }

  // Start Express Server
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🏥 MEDIMATRIX BACKEND SERVER RUNNING`);
    console.log(`🚀 Server listening on: http://localhost:${PORT}`);
    console.log('====================================================');
  });
});
