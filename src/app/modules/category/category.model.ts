import { Schema, model } from 'mongoose';
import { ICategory } from './category.interface';

const categorySchema = new Schema<ICategory>(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      lowercase: true
    },
    description: { 
      type: String, 
      default: '' 
    },
    parentCategory: { 
      type: Schema.Types.ObjectId, 
      ref: 'Category', // এখানে নিজের মডেলকেই রেফার করা হয়েছে সাব-ক্যাটাগরির জন্য
      default: null 
    },
    icon: { 
      type: String, 
      default: '' 
    },
    image: { 
      type: String, 
      required: true 
    },
    banner: { 
      type: String, 
      default: '' 
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive'], 
      default: 'active' 
    },
    order: { 
      type: Number, // সংখ্যা হিসেবে রাখলে সর্টিং (sorting) করতে সুবিধা হবে
      default: 0 
    },
    isFeatured: { 
      type: Boolean, 
      default: false 
    },
    showInHome: { 
      type: Boolean, 
      default: false 
    },
    showInMenu: { 
      type: Boolean, 
      default: false 
    },
    metaTitle: { 
      type: String, 
      default: '' 
    },
    metaDescription: { 
      type: String, 
      default: '' 
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

export const Category = model<ICategory>('Category', categorySchema);