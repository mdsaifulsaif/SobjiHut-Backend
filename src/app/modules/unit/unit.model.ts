import { Schema, model } from 'mongoose';
import { IUnit } from './unit.interface';

const unitSchema = new Schema<IUnit>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    shortName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, 
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

export const Unit = model<IUnit>('Unit', unitSchema);