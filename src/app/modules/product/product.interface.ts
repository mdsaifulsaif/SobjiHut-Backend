import { Types } from "mongoose";

export interface GetProductsParams {
  isNew?: string;
  limit?: number;
}

export interface IProductVariant {
  _id?: string;
  // variantName সরানো হয়েছে — unitID populate করে name আনা হবে
  weightOrVolume: number;
  unitID: Types.ObjectId | string;
  regularPrice: number;
  salePrice?: number;
  stock: number;
  sku?: string;
}

export interface IComboItem {
  productID: Types.ObjectId | string;
  quantity: number;
  selectedVariant?: Types.ObjectId | string; // variant এর _id
}

export interface ISpecification {
  key: string;
  value: string;
}

export interface IBrand {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
}

export interface IProduct {
  name: string;
  shortDescription: string;
  description: string;
  slug?: string;
  costPrice: number;
  regularPrice: number;
  salePrice?: number;
  discountPercent?: number;
  stock: number;
  reservedStock?: number;
  availableStock?: number; // virtual
  sku?: string;
  lowStockAlert?: number;
  thumbnail: string;
  images: string[];
  categoryID: Types.ObjectId | string;
  brandID: string | IBrand;
  tags: string[];
  rating?: number;
  numReviews?: number;
  status: "active" | "inactive" | "draft";
  productType: "single" | "combo";
  unit: Types.ObjectId | string; // single product এর unit
  weightOrVolume?: number; // single product এর weight/volume
  variants?: IProductVariant[];
  comboItems?: IComboItem[];
  specifications?: ISpecification[];
  isFeatured: boolean;
  isOnSale: boolean;
  isNew: boolean;
  weight?: number;
  shippingClass: "normal" | "fragile" | "heavy";
  freeShipping: boolean;
  shippingCost?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  metaTitle?: string;
  metaDescription?: string;
  straight_up?: string;
  lowdown?: string[];
}
