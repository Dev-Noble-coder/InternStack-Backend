import mongoose from 'mongoose';
import { config } from './config';
export const connectDatabase = () => mongoose.connect(config.MONGODB_URI);
export const disconnectDatabase = () => mongoose.disconnect();
