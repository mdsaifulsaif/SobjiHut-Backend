import mongoose, { Schema, Document } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  logo: string;
  description?: string;
  status: 'active' | 'inactive';
  isFeatured: boolean;
  showInHome: boolean;
  showInMenu: boolean;
  order: number;
  metaTitle?: string;
  metaDescription?: string;
  isDeleted: boolean;
}

const BrandSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isFeatured: { type: Boolean, default: false },
    showInHome: { type: Boolean, default: true },
    showInMenu: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    metaTitle: { type: String },
    metaDescription: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Brand = mongoose.model<IBrand>("Brand", BrandSchema);