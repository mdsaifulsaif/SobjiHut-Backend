import mongoose, { Schema, model } from "mongoose";
import { IProduct } from "./product.interface";

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true, trim: true },

    brandID: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Brand",
      default: "nonebrand",
    },
    categoryID: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    tags: [{ type: String, trim: true }],

    costPrice: { type: Number, required: true, min: 0 },
    regularPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    sku: { type: String, unique: true, sparse: true, trim: true },
    lowStockAlert: { type: Number, default: 10, min: 0 },

    productType: {
      type: String,
      enum: ["single", "combo"],
      default: "single",
    },

    // single product এর unit + weightOrVolume
    unit: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    weightOrVolume: { type: Number, min: 0 }, // single product এর জন্য

    variants: {
      type: [
        {
          // variantName সরানো হয়েছে
          // Display label = weightOrVolume + unitID.name (populate করে)
          weightOrVolume: { type: Number, required: true, min: 0 },
          unitID: {
            type: Schema.Types.ObjectId,
            ref: "Unit",
            required: true,
          },
          costPrice: { type: Number, min: 0, default: 0 },
          regularPrice: { type: Number, required: true, min: 0 },
          salePrice: { type: Number, min: 0 },
          stock: { type: Number, required: true, default: 0, min: 0 },
          sku: { type: String, trim: true },
        },
      ],
      default: [],
    },

    comboItems: {
      type: [
        {
          productID: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: { type: Number, default: 1, min: 1 },
          selectedVariant: {
            type: Schema.Types.ObjectId, // variant এর _id store হবে
            default: null,
          },
        },
      ],
      default: [],
    },

    specifications: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],

    thumbnail: { type: String, required: true, trim: true },
    images: [{ type: String, trim: true }],

    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    isFeatured: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
    isNew: { type: Boolean, default: true },

    freeShipping: { type: Boolean, default: false },
    shippingCost: { type: Number, default: 0, min: 0 },
    weight: { type: Number, min: 0 },
    shippingClass: {
      type: String,
      enum: ["normal", "fragile", "heavy"],
      default: "normal",
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },

    metaTitle: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },

    straight_up: { type: String, trim: true },
    lowdown: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  },
);

// available stock virtual
productSchema.virtual("availableStock").get(function () {
  return this.stock - (this.reservedStock || 0);
});

// pre save automation
productSchema.pre("save", async function () {
  // ১. slug auto generate
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  // ২. discount percent auto calculate
  if (this.regularPrice && this.salePrice) {
    this.discountPercent = Math.round(
      ((this.regularPrice - this.salePrice) / this.regularPrice) * 100,
    );
  } else {
    this.discountPercent = 0;
  }

  // ৩. variant থাকলে total stock + base price sync
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce(
      (total, variant) => total + variant.stock,
      0,
    );
    if (this.variants[0].regularPrice) {
      this.regularPrice = this.variants[0].regularPrice;
    }
    if (this.variants[0].salePrice) {
      this.salePrice = this.variants[0].salePrice;
    }
  }
});


export const Product = model<IProduct>("Product", productSchema);
