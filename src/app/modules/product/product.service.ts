import { GetProductsParams, IProduct } from "./product.interface";
import { Product } from "./product.model";
import { Order } from "../order/order.model";
import slugify from "slugify";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { PipelineStage } from "mongoose";

const createProductIntoDB = async (body: Record<string, any>, files: any) => {
  const {
    name,
    shortDescription,
    description,
    costPrice,
    regularPrice,
    categoryID,
    stock,
    unit,
    productType,
  } = body;

  // ১. রিকোয়ার্ড ফিল্ড ভ্যালিডেশন
  if (
    !name ||
    !shortDescription ||
    !costPrice ||
    !regularPrice ||
    !categoryID ||
    stock === undefined ||
    !unit
  ) {
    throw new Error(
      "Please provide all required fields: name, shortDescription, costPrice, regularPrice, categoryID, stock, and unit.",
    );
  }

  const cost = Number(costPrice);
  const regular = Number(regularPrice);
  const qty = Number(stock);
  const sale = body.salePrice ? Number(body.salePrice) : undefined;

  if (cost <= 0 || regular <= 0) {
    throw new Error("Prices must be greater than zero.");
  }
  if (sale && sale >= regular) {
    throw new Error("Sale price must be less than regular price.");
  }

  // ২. JSON অ্যারে ও অবজেক্ট সেফ পার্সিং
  let tags: string[] = [];
  let lowdown: string[] = [];
  let variants: any[] = [];
  let comboItems: any[] = [];
  let specifications: any[] = [];

  try {
    if (body.tags) tags = JSON.parse(body.tags);
    if (body.lowdown) lowdown = JSON.parse(body.lowdown);
    if (body.variants) variants = JSON.parse(body.variants);
    if (body.comboItems) comboItems = JSON.parse(body.comboItems);
    if (body.specifications) specifications = JSON.parse(body.specifications);
  } catch (error) {
    throw new Error("Invalid JSON format for array or object fields.");
  }

  // ৩. 🔥 কম্বো বান্ডেল স্ট্রিক্ট স্টক ভ্যালিডেশন লজিক
  if (productType === "combo") {
    if (!comboItems || comboItems.length === 0) {
      throw new Error("A combo product must contain at least one valid item.");
    }

    for (const item of comboItems) {
      if (!item.productID) {
        throw new Error("Each combo item must have a valid productID.");
      }

      // ডাটাবেজ থেকে আসল প্রোডাক্ট খুঁজে বের করা
      const dbProduct = await Product.findById(item.productID);
      if (!dbProduct) {
        throw new Error(
          `Product with ID ${item.productID} not found in database.`,
        );
      }

      const requiredQty = Number(item.quantity || 1);
      let availableStock = 0;

      // ক) যদি কম্বো আইটেমটি নির্দিষ্ট ভ্যারিয়েন্টের হয়
      if (item.selectedVariant) {
        const targetVariant = dbProduct.variants?.find(
          (v: any) => v.variantName === item.selectedVariant,
        );

        if (!targetVariant) {
          throw new Error(
            `Variant "${item.selectedVariant}" not found for product "${dbProduct.name}".`,
          );
        }

        availableStock = Number(targetVariant.stock || 0);

        if (availableStock <= 0) {
          throw new Error(
            `Cannot create combo! Variant "${item.selectedVariant}" of product "${dbProduct.name}" is currently Out of Stock.`,
          );
        }

        if (requiredQty > availableStock) {
          throw new Error(
            `Cannot create combo! Requested quantity (${requiredQty}) for variant "${item.selectedVariant}" exceeds available database stock (${availableStock}) in "${dbProduct.name}".`,
          );
        }
      }
      // খ) যদি কোনো ভ্যারিয়েন্ট না থাকে (নরমাল বা বেস প্রোডাক্ট)
      else {
        availableStock = Number(dbProduct.stock || 0);

        if (availableStock <= 0) {
          throw new Error(
            `Cannot create combo! "${dbProduct.name}" is currently Out of Stock.`,
          );
        }

        if (requiredQty > availableStock) {
          throw new Error(
            `Cannot create combo! Requested quantity (${requiredQty}) for "${dbProduct.name}" exceeds available database stock (${availableStock}).`,
          );
        }
      }
    }
  }

  // ৪. ডাইমেনশন অবজেক্ট ফিক্স (টাইপস্ক্রিপ্ট সেফ)
  const dimensions =
    body.length || body.width || body.height
      ? {
          length: body.length ? Number(body.length) : undefined,
          width: body.width ? Number(body.width) : undefined,
          height: body.height ? Number(body.height) : undefined,
        }
      : undefined;

  // ৫. পেলোড অবজেক্ট তৈরি
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
    brandID: body.brandID || "nonebrand", // 👈 এখানে brand এর জায়গায় brandID করা হয়েছে এবং ডিফল্ট nonebrand সেট করা হয়েছে
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

  // ৬. থাম্বনেইল ইমেজ আপলোড
  const thumbnailFiles = files?.thumbnail;
  if (thumbnailFiles && thumbnailFiles[0]) {
    const result: any = await uploadToCloudinary(
      thumbnailFiles[0].buffer,
      "glowly_products/thumbnails",
    );
    productData.thumbnail = result.secure_url || result.url;
  } else {
    throw new Error("Product thumbnail is required!");
  }

  // ७. গ্যালারি মাল্টিপল ইমেজ আপলোড
  const galleryFiles = files?.images;
  if (galleryFiles && galleryFiles.length > 0) {
    const uploadPromises = galleryFiles.map((file: any) =>
      uploadToCloudinary(file.buffer, "glowly_products/gallery"),
    );
    const uploadResults: any[] = await Promise.all(uploadPromises);
    productData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  // ৮. ডেটাবেজে ক্রিয়েট
  const result = await Product.create(productData);
  return result;
};

const updateProductIntoDB = async (id: string, payload: any) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  // ১. JSON ফিল্ডগুলো পার্স করা (FormData থেকে স্ট্রিং হিসেবে আসলে)
  const jsonFields = ['specifications', 'variants', 'comboItems', 'tags', 'lowdown'];
  for (const field of jsonFields) {
    if (payload[field] && typeof payload[field] === 'string') {
      try {
        payload[field] = JSON.parse(payload[field]);
      } catch (err) {
        throw new Error(`Invalid JSON format for field: ${field}`);
      }
    }
  }

  // ২. নাম্বার ফিল্ডগুলোকে নিরাপদ করা (NaN এরর রোধ করতে)
  const numericFields = ['weight', 'salePrice', 'regularPrice', 'costPrice', 'stock', 'shippingCost', 'lowStockAlert'];
  
  numericFields.forEach(field => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      const parsedValue = Number(payload[field]);
      if (isNaN(parsedValue)) {
        throw new Error(`${field} must be a valid number`);
      }
      payload[field] = parsedValue;
    } else if (payload[field] === '') {
      // যদি খালি স্ট্রিং পাঠানো হয় তবে সেটি ডিলিট করে দিন
      delete payload[field];
    }
  });

  // ৩. ডাইমেনশন অবজেক্ট হ্যান্ডেল করা
  if (payload.dimensions && typeof payload.dimensions === 'string') {
    payload.dimensions = JSON.parse(payload.dimensions);
  }

  // ৪. লজিক্যাল ভ্যালিডেশন
  if (payload.salePrice && payload.regularPrice && payload.salePrice >= payload.regularPrice) {
    throw new Error("Sale price must be less than regular price");
  }

  // ৫. ডিসকাউন্ট অটো ক্যালকুলেশন
  if (payload.regularPrice && payload.salePrice) {
    payload.discountPercent = Math.round(
      ((payload.regularPrice - payload.salePrice) / payload.regularPrice) * 100
    );
  }

  // ৬. আপডেট অপারেশন
  const updated = await Product.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updated;
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
