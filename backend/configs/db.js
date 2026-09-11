import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log('Database connected'));
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        const connectionUri = /mongodb(?:\+srv)?:\/\/[^\/]+\/.+/.test(uri)
            ? uri
            : `${uri.replace(/\/$/, '')}/movieticket`;
        await mongoose.connect(connectionUri);
    } catch (error) {
        console.log(error.message);
    }
};

export default connectDB;