import { Types } from "mongoose";

export interface IProductDimensions {
  length?: number;
  width?: number;
  height?: number;
}

export interface IProduct {
  // Basic Info
  name: string;
  slug: string;
  shortDescription: string;
  description: string;

  //  Pricing
  costPrice: number;
  regularPrice: number;
  salePrice?: number;
  discountPercent?: number;

  //  Inventory
  stock: number;
  sku?: string;
  lowStockAlert?: number;

  // Media
  thumbnail: string;
  images: string[];

  //  Branding & Category
  brand?: string;
  categoryID: Types.ObjectId;
  tags?: string[];

  //  Ratings & Reviews
  rating?: number;
  numReviews?: number;

  //  Status / Visibility
  status?: "active" | "inactive" | "draft";
  isFeatured: boolean;
  isNew: boolean;
  isBestseller?: boolean;

  //  Shipping
  weight?: number;
  shippingClass?: "normal" | "fragile" | "heavy";
  freeShipping?: boolean;

  //  Dimensions
  dimensions?: IProductDimensions;

  //  SEO
  metaTitle?: string;
  metaDescription?: string;

  //  Internal / AI / Admin
  straight_up?: string;
  lowdown?: string[];
}

export interface IProductUpdate {
  name?: string;
  slug?: string;
  description?: string;

  costPrice?: number;
  regularPrice?: number;
  salePrice?: number;
  discountPercent?: number;

  stock?: number;
  sku?: string;
  lowStockAlert?: number;

  thumbnail?: string;
  images?: string[];

  brand?: string;
  categoryID?: Types.ObjectId;
  tags?: string[];

  rating?: number;
  numReviews?: number;

  status?: "active" | "inactive" | "draft";
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;

  weight?: number;
  shippingClass?: "normal" | "fragile" | "heavy";
  freeShipping?: boolean;

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

export interface GetProductsParams {
  isNew?: string;
  limit?: number;
}




// import { Types } from "mongoose";

// export interface IProduct {
//   name: string;
//   description: string;
//   costPrice: number;
//   regularPrice: number;
//   salePrice?: number;
//   thumbnail: string;
//   images: string[];
//   categoryID: Types.ObjectId;
//   stock: number;
//   isFeatured: boolean;
//   isBestseller: boolean;
//   isNew: boolean;
//   straight_up: string;
//   lowdown: string[];
// }