const mongoose = require('mongoose');

// Client-controlled objections like `{ email: { $ne: null } }` must never
// become a query operator. Deliberate operators built in code are marked with
// mongoose.trusted() at those call sites. Set before any query is created.
mongoose.set('sanitizeFilter', true);

const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI);
		console.log(`MongoDB connected: ${conn.connection.host}`);
	} catch (error) {
		console.error('Error connecting to MongoDB:', error);
		process.exit(1);
	}
};

module.exports = connectDB;