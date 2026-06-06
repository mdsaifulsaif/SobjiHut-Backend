import mongoose, { Schema, Document } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  logo?: string; // ক্লাউডিনারি ইমেজের URL থাকবে এখানে
  isDeleted: boolean;
}

const BrandSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String, required: true }, 
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Brand = mongoose.model<IBrand>("Brand", BrandSchema);