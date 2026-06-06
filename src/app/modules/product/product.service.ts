import { GetProductsParams, IProduct } from "./product.interface";
import { Product } from "./product.model";
import { Order } from "../order/order.model";
import slugify from "slugify";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

// const createProductIntoDB = async (body: Record<string, any>, files: any) => {
//   const { name, shortDescription, description, costPrice, regularPrice, categoryID, stock, unit, productType } = body;

//   // ১. রিকোয়ার্ড ফিল্ড ভ্যালিডেশন
//   if (!name || !shortDescription || !costPrice || !regularPrice || !categoryID || stock === undefined || !unit) {
//     throw new Error("Please provide all required fields: name, shortDescription, costPrice, regularPrice, categoryID, stock, and unit.");
//   }

//   const cost = Number(costPrice);
//   const regular = Number(regularPrice);
//   const qty = Number(stock);
//   const sale = body.salePrice ? Number(body.salePrice) : undefined;

//   if (cost <= 0 || regular <= 0) {
//     throw new Error("Prices must be greater than zero.");
//   }
//   if (sale && sale >= regular) {
//     throw new Error("Sale price must be less than regular price.");
//   }

//   // ২. JSON অ্যারে ও অবজেক্ট সেফ পার্সিং
//   let tags: string[] = [];
//   let lowdown: string[] = [];
//   let variants: any[] = [];
//   let comboItems: any[] = [];
//   let specifications: any[] = [];

//   try {
//     if (body.tags) tags = JSON.parse(body.tags);
//     if (body.lowdown) lowdown = JSON.parse(body.lowdown);
//     if (body.variants) variants = JSON.parse(body.variants);
//     if (body.comboItems) comboItems = JSON.parse(body.comboItems);
//     if (body.specifications) specifications = JSON.parse(body.specifications);
//   } catch (error) {
//     throw new Error("Invalid JSON format for array or object fields.");
//   }

//   // ৩. ডাইমেনশন অবজেক্ট ফিক্স (টাইপস্ক্রিপ্ট সেফ)
//   const dimensions = body.length || body.width || body.height ? {
//     length: body.length ? Number(body.length) : undefined,
//     width: body.width ? Number(body.width) : undefined,
//     height: body.height ? Number(body.height) : undefined,
//   } : undefined;

//   // ৪. পেলোড অবজেক্ট তৈরি
//   const productData: Partial<IProduct> = {
//     name,
//     shortDescription,
//     description,
//     categoryID,
//     unit, // 👈 ইউনিট আইডি এখানে পারফেক্টলি অ্যাসাইন হচ্ছে
//     productType: productType || "single",
//     costPrice: cost,
//     regularPrice: regular,
//     salePrice: sale,
//     stock: qty,
//     sku: body.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
//     lowStockAlert: body.lowStockAlert ? Number(body.lowStockAlert) : 10,
//     brand: body.brand || "",
//     tags,
//     lowdown,
//     variants,
//     comboItems,
//     specifications,
//     weight: body.weight ? Number(body.weight) : undefined,
//     shippingCost: body.shippingCost ? Number(body.shippingCost) : 0,
//     freeShipping: body.freeShipping === "true",
//     isFeatured: body.isFeatured === "true",
//     isOnSale: body.isOnSale === "true",
//     isNew: body.isNew !== "false",
//     status: body.status || "active",
//     metaTitle: body.metaTitle || "",
//     metaDescription: body.metaDescription || "",
//     dimensions,
//   };

//   // ৫. থাম্বনেইল ইমেজ আপলোড
//   const thumbnailFiles = files?.thumbnail;
//   if (thumbnailFiles && thumbnailFiles[0]) {
//     const result: any = await uploadToCloudinary(thumbnailFiles[0].buffer, "glowly_products/thumbnails");
//     productData.thumbnail = result.secure_url || result.url;
//   } else {
//     throw new Error("Product thumbnail is required!");
//   }

//   // ৬. গ্যালারি মাল্টিপল ইমেজ আপলোড
//   const galleryFiles = files?.images;
//   if (galleryFiles && galleryFiles.length > 0) {
//     const uploadPromises = galleryFiles.map((file: any) =>
//       uploadToCloudinary(file.buffer, "glowly_products/gallery")
//     );
//     const uploadResults: any[] = await Promise.all(uploadPromises);
//     productData.images = uploadResults.map((res) => res.secure_url || res.url);
//   }

//   // ৭. ডেটাবেজে ক্রিয়েট
//   const result = await Product.create(productData);
//   return result;
// };

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

const updateProductIntoDB = async (id: string, payload: Partial<IProduct>) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  // 🔥 salePrice validation
  if (
    payload.salePrice &&
    payload.regularPrice &&
    payload.salePrice >= payload.regularPrice
  ) {
    throw new Error("Sale price must be less than regular price");
  }

  // 🔥 discount auto calculate
  if (payload.salePrice) {
    payload.discountPercent = Math.round(
      ((payload.regularPrice! - payload.salePrice) / payload.regularPrice!) *
        100,
    );
  }

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
    searchTerm,
    category,
    tag,
    page = 1,
    limit = 8,
    sort,
    ...filterData
  } = query;

  const filter: any = { ...filterData };

  // 1. serch logic
  if (searchTerm) {
    filter.$or = [
      { name: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { tags: { $regex: searchTerm, $options: "i" } },
    ];
  }

  // 2. category filter
  if (category && category !== "All Product") {
    filter.categoryID = category;
  }

  // 3. tag filter
  if (tag) {
    filter.tags = { $in: [tag] };
  }

  // 4. sorting
  let sortStr = "-createdAt";
  if (sort) {
    sortStr = sort as string;
  }

  // 5. paganation
  const skip = (Number(page) - 1) * Number(limit);

  // data fetch
  const result = await Product.find(filter)
    .populate("categoryID")
    .sort(sortStr)
    .skip(skip)
    .limit(Number(limit));

  // meta data calcualation
  const total = await Product.countDocuments(filter);
  const totalPage = Math.ceil(total / Number(limit));

  return {
    meta: { page: Number(page), limit: Number(limit), total, totalPage },
    data: result,
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
