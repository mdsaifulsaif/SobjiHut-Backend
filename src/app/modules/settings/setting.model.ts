import { Schema, model } from "mongoose";
import { ISetting } from "./setting.interface";

const settingSchema = new Schema<ISetting>(
  {
    siteName: { type: String, required: true, default: "MegaShop" },
    tagline: { type: String, default: "Your One-Stop E-Commerce Store" },
    siteURL: { type: String },
    logo: { type: String },
    favicon: { type: String },

    email: { type: String, required: true },
    phone: { type: String, required: true },
    whatsapp: { type: String },
    address: { type: String, required: true },

    currency: { type: String, default: "BDT - Bangladeshi Taka" },
    currencySymbol: { type: String, default: "৳" },
    symbolPosition: {
      type: String,
      enum: ["before", "after"],
      default: "before",
    },

    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const Setting = model<ISetting>("Setting", settingSchema);