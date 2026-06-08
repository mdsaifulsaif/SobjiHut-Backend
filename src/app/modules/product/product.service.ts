import { GetProductsParams, IProduct } from "./product.interface";
import { Product } from "./product.model";
import { Order } from "../order/order.model";
import slugify from "slugify";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { PipelineStage } from "mongoose";
import cloudinary from "../../config/cloudinary";

const createProductIntoDB = async (body: Record<string, any>, files: any) => {
  const {
    name,
    shortDescription,
    description,
    costPrice,
    categoryID,
    stock,
    unit,
    productType,
  } = body;

  // ১. আগে variants parse করো
  let variants: any[] = [];
  try {
    if (body.variants) variants = JSON.parse(body.variants);
  } catch (error) {
    throw new Error("Invalid JSON format for variants.");
  }

  const hasVariants = variants && variants.length > 0;

  // ২. Required field validation
  if (!name || !shortDescription || !categoryID || !unit) {
    throw new Error("Please provide all required fields: name, shortDescription, categoryID, and unit.");
  }

  // variant না থাকলে regularPrice এবং stock required
  if (!hasVariants) {
    if (!body.regularPrice) throw new Error("Regular price is required for non-variant products.");
    if (stock === undefined) throw new Error("Stock is required for non-variant products.");
  }

  const cost = Number(costPrice) || 0;
  const regular = hasVariants
    ? Number(variants[0]?.regularPrice || 0)
    : Number(body.regularPrice);
  const qty = hasVariants
    ? variants.reduce((total: number, v: any) => total + Number(v.stock || 0), 0)
    : Number(stock);
  const sale = body.salePrice ? Number(body.salePrice) : undefined;

  // ৩. Price validation — variant থাকলে base price check করবে না
  if (!hasVariants) {
    if (cost <= 0 || regular <= 0) {
      throw new Error("Prices must be greater than zero.");
    }
    if (sale && sale >= regular) {
      throw new Error("Sale price must be less than regular price.");
    }
  } else {
    // variant এর price validate করো
    for (const variant of variants) {
      if (!variant.regularPrice || Number(variant.regularPrice) <= 0) {
        throw new Error(`Variant "${variant.variantName}" এর Regular Price must be greater than zero.`);
      }
    }
  }

  // ৪. বাকি JSON parse
  let tags: string[] = [];
  let lowdown: string[] = [];
  let comboItems: any[] = [];
  let specifications: any[] = [];

  try {
    if (body.tags) tags = JSON.parse(body.tags);
    if (body.lowdown) lowdown = JSON.parse(body.lowdown);
    if (body.comboItems) comboItems = JSON.parse(body.comboItems);
    if (body.specifications) specifications = JSON.parse(body.specifications);
  } catch (error) {
    throw new Error("Invalid JSON format for array or object fields.");
  }

  // ৫. Combo validation
  if (productType === "combo") {
    if (!comboItems || comboItems.length === 0) {
      throw new Error("A combo product must contain at least one valid item.");
    }

    for (const item of comboItems) {
      if (!item.productID) {
        throw new Error("Each combo item must have a valid productID.");
      }

      const dbProduct = await Product.findById(item.productID);
      if (!dbProduct) {
        throw new Error(`Product with ID ${item.productID} not found in database.`);
      }

      const requiredQty = Number(item.quantity || 1);

      if (item.selectedVariant) {
        const targetVariant = dbProduct.variants?.find(
          (v: any) => v.variantName === item.selectedVariant,
        );
        if (!targetVariant) {
          throw new Error(`Variant "${item.selectedVariant}" not found for product "${dbProduct.name}".`);
        }
        const availableStock = Number(targetVariant.stock || 0);
        if (availableStock <= 0) {
          throw new Error(`Cannot create combo! Variant "${item.selectedVariant}" of product "${dbProduct.name}" is currently Out of Stock.`);
        }
        if (requiredQty > availableStock) {
          throw new Error(`Cannot create combo! Requested quantity (${requiredQty}) for variant "${item.selectedVariant}" exceeds available stock (${availableStock}) in "${dbProduct.name}".`);
        }
      } else {
        const availableStock = Number(dbProduct.stock || 0);
        if (availableStock <= 0) {
          throw new Error(`Cannot create combo! "${dbProduct.name}" is currently Out of Stock.`);
        }
        if (requiredQty > availableStock) {
          throw new Error(`Cannot create combo! Requested quantity (${requiredQty}) for "${dbProduct.name}" exceeds available stock (${availableStock}).`);
        }
      }
    }
  }

  // ৬. Dimensions
  const dimensions =
    body.length || body.width || body.height
      ? {
          length: body.length ? Number(body.length) : undefined,
          width: body.width ? Number(body.width) : undefined,
          height: body.height ? Number(body.height) : undefined,
        }
      : undefined;

  // ৭. Payload
  const productData: Partial<IProduct> = {
    name,
    shortDescription,
    description,
    categoryID,
    unit,
    productType: productType || "single",
    costPrice: cost,
    regularPrice: regular,
    salePrice: sale,
    stock: qty,
    sku: body.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    lowStockAlert: body.lowStockAlert ? Number(body.lowStockAlert) : 10,
    brandID: body.brandID || "nonebrand",
    tags,
    lowdown,
    variants,
    comboItems,
    specifications,
    weight: body.weight ? Number(body.weight) : undefined,
    shippingCost: body.shippingCost ? Number(body.shippingCost) : 0,
    freeShipping: body.freeShipping === "true",
    isFeatured: body.isFeatured === "true",
    isOnSale: body.isOnSale === "true",
    isNew: body.isNew !== "false",
    status: body.status || "active",
    metaTitle: body.metaTitle || "",
    metaDescription: body.metaDescription || "",
    dimensions,
  };

  // ৮. Thumbnail upload
  const thumbnailFiles = files?.thumbnail;
  if (thumbnailFiles && thumbnailFiles[0]) {
    const result: any = await uploadToCloudinary(thumbnailFiles[0].buffer, "glowly_products/thumbnails");
    productData.thumbnail = result.secure_url || result.url;
  } else {
    throw new Error("Product thumbnail is required!");
  }

  // ৯. Gallery upload
  const galleryFiles = files?.images;
  if (galleryFiles && galleryFiles.length > 0) {
    const uploadResults: any[] = await Promise.all(
      galleryFiles.map((file: any) => uploadToCloudinary(file.buffer, "glowly_products/gallery")),
    );
    productData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  const result = await Product.create(productData);
  return result;
};


// ===================== UPDATE SERVICE =====================
const updateProductIntoDB = async (id: string, body: Record<string, any>, files: any) => {
  // ১. Product exists চেক
  const existingProduct = await Product.findById(id);
  if (!existingProduct) {
    throw new Error("Product not found!");
  }

  // ২. আগে variants parse করো
let variants: any[] = (existingProduct.variants ?? []) as any[];
try {
    if (body.variants) variants = JSON.parse(body.variants);
} catch (error) {
    throw new Error("Invalid JSON format for variants.");
}

  const hasVariants = variants && variants.length > 0;

  // ৩. Price validation
  if (body.regularPrice || body.costPrice) {
    if (!hasVariants) {
      const cost = Number(body.costPrice || existingProduct.costPrice);
      const regular = Number(body.regularPrice || existingProduct.regularPrice);
      const sale = body.salePrice !== undefined ? Number(body.salePrice) : existingProduct.salePrice;

      if (cost <= 0 || regular <= 0) {
        throw new Error("Prices must be greater than zero.");
      }
      if (sale && sale >= regular) {
        throw new Error("Sale price must be less than regular price.");
      }
    } else {
      for (const variant of variants) {
        if (!variant.regularPrice || Number(variant.regularPrice) <= 0) {
          throw new Error(`Variant "${variant.variantName}" এর Regular Price must be greater than zero.`);
        }
      }
    }
  }

  // ৪. বাকি JSON parse
  let tags = existingProduct.tags;
  let lowdown = existingProduct.lowdown;
  let comboItems = existingProduct.comboItems;
  let specifications = existingProduct.specifications;

  try {
    if (body.tags) tags = JSON.parse(body.tags);
    if (body.lowdown) lowdown = JSON.parse(body.lowdown);
    if (body.comboItems) comboItems = JSON.parse(body.comboItems);
    if (body.specifications) specifications = JSON.parse(body.specifications);
  } catch (error) {
    throw new Error("Invalid JSON format for array or object fields.");
  }

  // ৫. Combo validation
  const productType = body.productType || existingProduct.productType;
  if (productType === "combo" && body.comboItems) {
    if (!comboItems || comboItems.length === 0) {
      throw new Error("A combo product must contain at least one valid item.");
    }

    for (const item of comboItems) {
      if (!item.productID) {
        throw new Error("Each combo item must have a valid productID.");
      }

      const dbProduct = await Product.findById(item.productID);
      if (!dbProduct) {
        throw new Error(`Product with ID ${item.productID} not found.`);
      }

      const requiredQty = Number(item.quantity || 1);

      if (item.selectedVariant) {
        const targetVariant = dbProduct.variants?.find(
          (v: any) => v.variantName === item.selectedVariant,
        );
        if (!targetVariant) {
          throw new Error(`Variant "${item.selectedVariant}" not found for product "${dbProduct.name}".`);
        }
        const availableStock = Number(targetVariant.stock || 0);
        if (availableStock <= 0) {
          throw new Error(`Variant "${item.selectedVariant}" of "${dbProduct.name}" is Out of Stock.`);
        }
        if (requiredQty > availableStock) {
          throw new Error(`Requested quantity (${requiredQty}) for variant "${item.selectedVariant}" exceeds available stock (${availableStock}).`);
        }
      } else {
        const availableStock = Number(dbProduct.stock || 0);
        if (availableStock <= 0) {
          throw new Error(`"${dbProduct.name}" is Out of Stock.`);
        }
        if (requiredQty > availableStock) {
          throw new Error(`Requested quantity (${requiredQty}) for "${dbProduct.name}" exceeds available stock (${availableStock}).`);
        }
      }
    }
  }

  // ৬. Dimensions
  const dimensions =
    body.length || body.width || body.height
      ? {
          length: body.length ? Number(body.length) : existingProduct.dimensions?.length,
          width: body.width ? Number(body.width) : existingProduct.dimensions?.width,
          height: body.height ? Number(body.height) : existingProduct.dimensions?.height,
        }
      : existingProduct.dimensions;

  // ৭. Update payload — variant থাকলে stock ও price auto set
  const updateData: Partial<IProduct> = {
    ...(body.name && { name: body.name }),
    ...(body.shortDescription && { shortDescription: body.shortDescription }),
    ...(body.description && { description: body.description }),
    ...(body.categoryID && { categoryID: body.categoryID }),
    ...(body.unit && { unit: body.unit }),
    ...(body.brandID && { brandID: body.brandID }),
    ...(body.productType && { productType: body.productType }),
    ...(body.costPrice && { costPrice: Number(body.costPrice) }),
    // ✅ variant থাকলে first variant এর price নাও, না থাকলে body থেকে নাও
    regularPrice: hasVariants
      ? Number(variants[0]?.regularPrice || existingProduct.regularPrice)
      : (body.regularPrice ? Number(body.regularPrice) : existingProduct.regularPrice),
    // ✅ variant থাকলে total stock auto calculate
    stock: hasVariants
      ? variants.reduce((total: number, v: any) => total + Number(v.stock || 0), 0)
      : (body.stock !== undefined ? Number(body.stock) : existingProduct.stock),
    ...(body.salePrice !== undefined && { salePrice: Number(body.salePrice) }),
    ...(body.sku && { sku: body.sku }),
    ...(body.lowStockAlert !== undefined && { lowStockAlert: Number(body.lowStockAlert) }),
    ...(body.weight !== undefined && { weight: Number(body.weight) }),
    ...(body.shippingCost !== undefined && { shippingCost: Number(body.shippingCost) }),
    ...(body.shippingClass && { shippingClass: body.shippingClass }),
    ...(body.freeShipping !== undefined && { freeShipping: body.freeShipping === 'true' }),
    ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured === 'true' }),
    ...(body.isOnSale !== undefined && { isOnSale: body.isOnSale === 'true' }),
    ...(body.isNew !== undefined && { isNew: body.isNew === 'true' }),
    ...(body.status && { status: body.status }),
    ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
    ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription }),
    ...(body.straight_up !== undefined && { straight_up: body.straight_up }),
    tags,
    lowdown,
    variants,
    comboItems,
    specifications,
    dimensions,
  };

  // ৮. Thumbnail update
  const thumbnailFiles = files?.thumbnail;
  if (thumbnailFiles && thumbnailFiles[0]) {
    if (existingProduct.thumbnail) {
      const publicId = existingProduct.thumbnail
        .split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(publicId);
    }
    const result: any = await uploadToCloudinary(thumbnailFiles[0].buffer, 'glowly_products/thumbnails');
    updateData.thumbnail = result.secure_url || result.url;
  }

  // ৯. Gallery update
  const galleryFiles = files?.images;
  if (galleryFiles && galleryFiles.length > 0) {
    if (existingProduct.images && existingProduct.images.length > 0) {
      await Promise.all(
        existingProduct.images.map((imgUrl: string) => {
          const publicId = imgUrl.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');
          return cloudinary.uploader.destroy(publicId);
        }),
      );
    }
    const uploadResults: any[] = await Promise.all(
      galleryFiles.map((file: any) => uploadToCloudinary(file.buffer, 'glowly_products/gallery')),
    );
    updateData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true },
  ).populate('categoryID', 'name image');

  return updatedProduct;
};




export const getNewProductsService = async (params: GetProductsParams) => {
  const { isNew, limit } = params;

  // max 4 enforce
  const safeLimit = Math.min(Number(limit) || 4, 4);

  const filter: any = {};

  if (isNew === "true") {
    filter.isNew = true;
  }

  const products = await Product.find(filter)
    .limit(safeLimit)
    .sort({ createdAt: -1 });

  return products;
};

const getAllProductsFromDB = async (query: Record<string, any>) => {
  const { 
    searchTerm, category, productType, status, isFeatured, 
    page = 1, limit = 8, sort = "-createdAt" 
  } = query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  const matchStage: any = {};
  if (searchTerm) {
    matchStage.$or = [
      { name: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }
  if (category) matchStage.categoryID = category;
  if (productType) matchStage.productType = productType;
  if (status) matchStage.status = status;
  if (isFeatured !== undefined) matchStage.isFeatured = isFeatured === 'true';

  // সমাধান: Facet এর ভেতরের স্টেজগুলোকে 'any' হিসেবে চিহ্নিত করা যাতে টাইপ এরর না আসে
  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    {
      $facet: {
        data: [
          { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          { $lookup: { from: "categories", localField: "categoryID", foreignField: "_id", as: "categoryID" } },
          { $unwind: { path: "$categoryID", preserveNullAndEmptyArrays: true } }
        ] as any, // 👈 এখানে 'as any' ব্যবহার করলে এরর চলে যাবে
        metaCounts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
              inactive: { $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] } },
              lowStock: { $sum: { $cond: [{ $lte: ["$stock", "$lowStockAlert"] }, 1, 0] } },
              featured: { $sum: { $cond: ["$isFeatured", 1, 0] } }
            }
          }
        ] as any // 👈 এখানে 'as any' ব্যবহার করুন
      }
    }
  ];

  const result = await Product.aggregate(pipeline);
  const facetData = result[0];
  const total = facetData.metaCounts[0]?.total || 0;

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total,
      totalPage: Math.ceil(total / limitNum),
      counts: facetData.metaCounts[0] || { total: 0, active: 0, inactive: 0, lowStock: 0, featured: 0 }
    },
    data: facetData.data,
  };
};

const deleteProductFromDB = async (id: string) => {
  const result = await Product.findByIdAndDelete(id);
  return result;
};

const getSingleProductFromDB = async (id: string) => {
  const result = await Product.findById(id).populate("categoryID");

  if (!result) {
    throw new Error("Product not found!");
  }

  return result;
};

const getBestsellingProductsFromDB = async (limit: number) => {
  const result = await Order.aggregate([
    { $unwind: "$cartItems" },

    {
      $group: {
        _id: "$cartItems.product",
        totalSold: { $sum: "$cartItems.quantity" },
      },
    },

    { $sort: { totalSold: -1 } },

    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "fullProduct",
      },
    },

    { $unwind: "$fullProduct" },

    {
      $match: {
        "fullProduct.status": "active",
      },
    },

    { $limit: limit },

    {
      $project: {
        _id: 0,
        totalSold: 1,
        product: "$fullProduct",
      },
    },
  ]);

  return result;
};

const getRelatedProductsFromDB = async (
  categoryId: string,
  productId: string,
) => {
  const result = await Product.find({
    categoryID: categoryId, // Same category hote hobe
    _id: { $ne: productId }, // $ne mane 'Not Equal' - mane current product bad diye
  })
    .limit(4) // Figma design e 4ti product ache
    .populate("categoryID");

  return result;
};

const getLowStockProductsFromDB = async () => {
  const result = await Product.find({
    $expr: { $lte: ["$stock", "$lowStockAlert"] },
  })
    .populate("categoryID")
    .sort({ stock: 1 });

  return result;
};

export const ProductServices = {
  createProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  deleteProductFromDB,
  getBestsellingProductsFromDB,
  getRelatedProductsFromDB,
  updateProductIntoDB,
  getNewProductsService,
  getLowStockProductsFromDB,
};
