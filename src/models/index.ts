import { Schema, model, Types } from 'mongoose';

export type Role = 'student' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
const opts = { timestamps: true };
const UserSchema = new Schema({ firstName: { type: String, required: true, trim: true }, lastName: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true }, passwordHash: { type: String, required: true, select: false }, role: { type: String, enum: ['student', 'admin'], default: 'student' }, status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' }, emailVerified: { type: Boolean, default: false }, profilePicture: String, lastLoginAt: Date }, opts);
const AuthCodeSchema = new Schema({ userId: { type: Types.ObjectId, ref: 'User', required: true, index: true }, codeHash: { type: String, required: true }, purpose: { type: String, enum: ['email_verification', 'password_reset'], required: true }, expiresAt: { type: Date, required: true, index: true }, attempts: { type: Number, default: 0 }, usedAt: Date }, opts);
const SessionSchema = new Schema({ userId: { type: Types.ObjectId, ref: 'User', required: true, index: true }, refreshTokenHash: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true, index: true }, lastUsedAt: Date, revokedAt: Date, replacedBy: { type: Types.ObjectId, ref: 'Session' }, metadata: Schema.Types.Mixed }, opts);
export const User = model('User', UserSchema); export const AuthCode = model('AuthCode', AuthCodeSchema); export const Session = model('Session', SessionSchema);
