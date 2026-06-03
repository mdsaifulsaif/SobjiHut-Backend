import { Schema, model } from 'mongoose';
import { ISubscriber } from './subscriber.interface';

const subscriberSchema = new Schema<ISubscriber>(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true,
      trim: true 
    },
    status: { 
      type: String, 
      enum: ['active', 'unsubscribed'], 
      default: 'active' 
    },
  },
  {
    timestamps: true, 
    versionKey: '__v', 
  }
);

export const Subscriber = model<ISubscriber>('Subscriber', subscriberSchema);