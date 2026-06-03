

import { Schema, model } from 'mongoose';
import { IUser, IUserModel } from './user.interface';
import bcrypt from 'bcryptjs';

const userSchema = new Schema<IUser>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    phoneNumber: { type: String },
    status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active',
  },
    avatar: {
        public_id: { type: String },
        url: { type: String, default: "https://example.com/default-avatar.png" }
    },
    shippingAddress: {
        addressLine: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        postalCode: { type: String, default: "" },
        country: { type: String, default: "Bangladesh" }
    },
}, { timestamps: true });


userSchema.statics.isPasswordMatched = async function (givenPassword, hashedPassword) {
    return await bcrypt.compare(givenPassword, hashedPassword);
};

export const User = model<IUser, IUserModel>('User', userSchema);