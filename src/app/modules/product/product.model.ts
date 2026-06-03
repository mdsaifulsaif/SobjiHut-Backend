



import { Schema, model } from "mongoose";
import { IProduct } from "./product.interface";

const productSchema = new Schema<IProduct>(
  {
    //  Basic Info (OLD KEEP)
    name: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },

    //  slug (auto)
    slug: { type: String, unique: true },

    //  Pricing (OLD KEEP)
    costPrice: { type: Number, required: true },
    regularPrice: { type: Number, required: true },
    salePrice: { type: Number },

    //  Discount
    discountPercent: { type: Number, default: 0 },

    //  Inventory (OLD KEEP)
    stock: { type: Number, required: true, default: 0 },

    //  SKU + Alert
    sku: { type: String, unique: true, sparse: true },
    lowStockAlert: { type: Number, default: 10 },

    //  Media (OLD KEEP)
    thumbnail: { type: String, required: true },
    images: [{ type: String }],

    //  Category (OLD KEEP)
    categoryID: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    //  Branding
    brand: { type: String },
    tags: [{ type: String }],

    //  Reviews
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    //  Status
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },

    // ⚡ Flags (OLD KEEP)
    isFeatured: { type: Boolean, default: false },
    isNew: { type: Boolean, default: true },

    //  Shipping
    weight: { type: Number },
    shippingClass: {
      type: String,
      enum: ["normal", "fragile", "heavy"],
      default: "normal",
    },
    freeShipping: { type: Boolean, default: false },

    //  Dimensions
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },

    //  SEO
    metaTitle: { type: String },
    metaDescription: { type: String },

    //  Internal (OLD KEEP)
    straight_up: { type: String },
    lowdown: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export const Product = model<IProduct>("Product", productSchema);