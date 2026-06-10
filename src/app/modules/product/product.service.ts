import { GetProductsParams, IProduct } from "./product.interface";
import { Product } from "./product.model";
import slugify from "slugify";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { PipelineStage } from "mongoose";
import cloudinary from "../../config/cloudinary";

// ===================== CREATE =====================
const createProductIntoDB = async (body: Record<string, any>, files: any) => {
  const { name, shortDescription, description, categoryID, stock, unit, productType } = body;

  // ১. variants parse আগে
  let variants: any[] = [];
  try {
    if (body.variants) variants = JSON.parse(body.variants);
  } catch {
    throw new Error("Invalid JSON format for variants.");
  }

  // ২. বাকি JSON parse
  let comboItems: any[] = [];
  let tags: string[] = [];
  let lowdown: string[] = [];
  let specifications: any[] = [];

  try {
    if (body.comboItems) comboItems = JSON.parse(body.comboItems);
    if (body.tags) tags = JSON.parse(body.tags);
    if (body.lowdown) lowdown = JSON.parse(body.lowdown);
    if (body.specifications) specifications = JSON.parse(body.specifications);
  } catch {
    throw new Error("Invalid JSON format for array fields.");
  }

  const hasVariants = variants && variants.length > 0;
  const isCombo = productType === "combo";
  const isSingle = !isCombo;

  // ৩. required field validation
  if (!name || !shortDescription || !categoryID) {
    throw new Error("Please provide: name, shortDescription, categoryID.");
  }

  // ✅ unit শুধু single product এ required (variant নেই)
  if (isSingle && !hasVariants && !unit) {
    throw new Error("Unit is required for single product.");
  }

  // ✅ single product (no variant) এ price/stock/weightOrVolume required
  if (isSingle && !hasVariants) {
    if (!body.regularPrice) throw new Error("Regular price is required.");
    if (stock === undefined || stock === null) throw new Error("Stock is required.");
    if (!body.weightOrVolume) throw new Error("weightOrVolume is required for single product.");
  }

  // ৪. variant validation
  if (hasVariants) {
    const seen = new Set<string>();
    for (const variant of variants) {
      if (!variant.unitID) throw new Error(`একটি variant এ unitID দেওয়া হয়নি।`);
      if (!variant.regularPrice || Number(variant.regularPrice) <= 0)
        throw new Error(`একটি variant এ regularPrice দেওয়া হয়নি বা শূন্য।`);
      if (variant.weightOrVolume === undefined || variant.weightOrVolume === null)
        throw new Error(`একটি variant এ weightOrVolume দেওয়া হয়নি।`);

      const key = `${variant.unitID}_${Number(variant.weightOrVolume)}`;
      if (seen.has(key)) throw new Error(`Duplicate variant found.`);
      seen.add(key);
    }
  }

  // ৫. price calculate
  const cost = isCombo
    ? Number(body.costPrice) || 0
    : hasVariants
      ? 0
      : Number(body.costPrice) || 0;

  const regular = isCombo
    ? Number(body.regularPrice) || 0
    : hasVariants
      ? Number(variants[0]?.regularPrice || 0)
      : Number(body.regularPrice) || 0;

  const qty = isCombo
    ? Number(stock) || 0
    : hasVariants
      ? variants.reduce((total: number, v: any) => total + Number(v.stock || 0), 0)
      : Number(stock) || 0;

  const sale = body.salePrice ? Number(body.salePrice) : undefined;

  // ৬. price validation — শুধু single (no variant) এ
  if (isSingle && !hasVariants) {
    if (regular <= 0) throw new Error("Regular price must be greater than zero.");
    if (sale && sale >= regular) throw new Error("Sale price must be less than regular price.");
  }

  // ৭. combo validation + selectedVariant clean
  if (isCombo) {
    if (!comboItems || comboItems.length === 0) {
      throw new Error("Combo product must have at least one item.");
    }

    // ✅ selectedVariant empty string → null
    comboItems = comboItems.map((item: any) => ({
      ...item,
      selectedVariant: item.selectedVariant && item.selectedVariant !== ""
        ? item.selectedVariant
        : null,
    }));

    for (const item of comboItems) {
      if (!item.productID) throw new Error("Each combo item must have productID.");
      const dbProduct = await Product.findById(item.productID);
      if (!dbProduct) throw new Error(`Product not found: ${item.productID}`);
      const requiredQty = Number(item.quantity || 1);

      if (item.selectedVariant) {
        const targetVariant = dbProduct.variants?.find(
          (v: any) => v._id?.toString() === item.selectedVariant,
        );
        if (!targetVariant) throw new Error(`Variant not found.`);
        if (Number(targetVariant.stock) <= 0) throw new Error(`Variant is Out of Stock.`);
        if (requiredQty > Number(targetVariant.stock)) throw new Error(`Insufficient stock for variant.`);
      } else {
        const available = dbProduct.stock - (dbProduct.reservedStock || 0);
        if (available <= 0) throw new Error(`"${dbProduct.name}" is Out of Stock.`);
        if (requiredQty > available) throw new Error(`Insufficient stock for "${dbProduct.name}".`);
      }
    }
  }

  // ৮. dimensions
  const dimensions =
    body.length || body.width || body.height
      ? {
          length: body.length ? Number(body.length) : undefined,
          width: body.width ? Number(body.width) : undefined,
          height: body.height ? Number(body.height) : undefined,
        }
      : undefined;

  // ৯. payload
  const productData: Partial<IProduct> = {
    name,
    shortDescription,
    description,
    categoryID,
    productType: productType || "single",
    costPrice: cost,
    regularPrice: regular,
    salePrice: sale,
    stock: qty,

    // ✅ unit — single product এ body থেকে, combo/variant এ null
    unit: isSingle && !hasVariants && unit ? unit : null,

    // ✅ weightOrVolume — শুধু single product এ
    ...(isSingle && !hasVariants && body.weightOrVolume && {
      weightOrVolume: Number(body.weightOrVolume),
    }),

    sku: body.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    lowStockAlert: body.lowStockAlert ? Number(body.lowStockAlert) : 10,

    // ✅ brandID — combo তে nonebrand
    brandID: isCombo ? "nonebrand" : (body.brandID || "nonebrand"),

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

  // ১০. thumbnail upload
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

  // ১১. gallery upload
  const galleryFiles = files?.images;
  if (galleryFiles && galleryFiles.length > 0) {
    const uploadResults: any[] = await Promise.all(
      galleryFiles.map((file: any) =>
        uploadToCloudinary(file.buffer, "glowly_products/gallery"),
      ),
    );
    productData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  return await Product.create(productData);
};

// ===================== UPDATE =====================
const updateProductIntoDB = async (
  id: string,
  body: Record<string, any>,
  files: any,
) => {
  const existingProduct = await Product.findById(id);
  if (!existingProduct) throw new Error("Product not found!");

  // ১. variants parse
  let variants: any[] = (existingProduct.variants ?? []) as any[];
  try {
    if (body.variants) variants = JSON.parse(body.variants);
  } catch {
    throw new Error("Invalid JSON format for variants.");
  }

  const hasVariants = variants && variants.length > 0;
  const isCombo = (body.productType || existingProduct.productType) === "combo";

  // ২. variant validation
  if (hasVariants) {
    const seen = new Set<string>();
    for (const variant of variants) {
      if (!variant.unitID) throw new Error(`একটি variant এ unitID দেওয়া হয়নি।`);
      if (!variant.regularPrice || Number(variant.regularPrice) <= 0)
        throw new Error(`একটি variant এ regularPrice দেওয়া হয়নি বা শূন্য।`);
      if (variant.weightOrVolume === undefined || variant.weightOrVolume === null)
        throw new Error(`একটি variant এ weightOrVolume দেওয়া হয়নি।`);

      const key = `${variant.unitID}_${Number(variant.weightOrVolume)}`;
      if (seen.has(key))
        throw new Error(`Duplicate variant found.`);
      seen.add(key);
    }
  }

  // ৩. price validation (single product only)
  if (!hasVariants && !isCombo && (body.regularPrice || body.costPrice)) {
    const cost = Number(body.costPrice || existingProduct.costPrice);
    const regular = Number(body.regularPrice || existingProduct.regularPrice);
    const sale = body.salePrice !== undefined
      ? Number(body.salePrice)
      : existingProduct.salePrice;

    if (regular <= 0) throw new Error("Regular price must be greater than zero.");
    if (sale && sale >= regular) throw new Error("Sale price must be less than regular price.");
  }

  // ৪. JSON parse
  let tags = existingProduct.tags;
  let lowdown = existingProduct.lowdown;
  let comboItems: any[] = (existingProduct.comboItems ?? []) as any[];
  let specifications = existingProduct.specifications;

  try {
    if (body.tags) tags = JSON.parse(body.tags);
    if (body.lowdown) lowdown = JSON.parse(body.lowdown);
    if (body.comboItems) comboItems = JSON.parse(body.comboItems);
    if (body.specifications) specifications = JSON.parse(body.specifications);
  } catch {
    throw new Error("Invalid JSON format for array fields.");
  }

  // ৫. combo validation + selectedVariant clean
  const productType = body.productType || existingProduct.productType;
  if (productType === "combo" && body.comboItems) {
    // ✅ selectedVariant empty string → null
    comboItems = comboItems.map((item: any) => ({
      ...item,
      selectedVariant: item.selectedVariant && item.selectedVariant !== ""
        ? item.selectedVariant
        : null,
    }));

    if (!comboItems || comboItems.length === 0)
      throw new Error("Combo must have at least one item.");

    for (const item of comboItems) {
      if (!item.productID) throw new Error("Each combo item must have productID.");
      const dbProduct = await Product.findById(item.productID);
      if (!dbProduct) throw new Error(`Product not found: ${item.productID}`);
      const requiredQty = Number(item.quantity || 1);
      const available = dbProduct.stock - (dbProduct.reservedStock || 0);
      if (available <= 0) throw new Error(`"${dbProduct.name}" is Out of Stock.`);
      if (requiredQty > available) throw new Error(`Insufficient stock for "${dbProduct.name}".`);
    }
  }

  // ৬. dimensions
  const dimensions =
    body.length || body.width || body.height
      ? {
          length: body.length ? Number(body.length) : existingProduct.dimensions?.length,
          width: body.width ? Number(body.width) : existingProduct.dimensions?.width,
          height: body.height ? Number(body.height) : existingProduct.dimensions?.height,
        }
      : existingProduct.dimensions;

  // ৭. update payload
  const updateData: Partial<IProduct> = {
    ...(body.name && { name: body.name }),
    ...(body.shortDescription && { shortDescription: body.shortDescription }),
    ...(body.description && { description: body.description }),
    ...(body.categoryID && { categoryID: body.categoryID }),
    ...(body.productType && { productType: body.productType }),

    // ✅ unit — single (no variant) এ update, অন্যথায় null
    unit: !hasVariants && !isCombo && body.unit
      ? body.unit
      : existingProduct.unit,

    // ✅ brandID — combo তে nonebrand
    brandID: isCombo
      ? "nonebrand"
      : (body.brandID || existingProduct.brandID),

    // ✅ costPrice
    costPrice: hasVariants
      ? 0
      : isCombo
        ? Number(body.costPrice) || existingProduct.costPrice
        : body.costPrice
          ? Number(body.costPrice)
          : existingProduct.costPrice,

    // ✅ regularPrice
    regularPrice: hasVariants
      ? Number(variants[0]?.regularPrice || existingProduct.regularPrice)
      : body.regularPrice
        ? Number(body.regularPrice)
        : existingProduct.regularPrice,

    // ✅ stock
    stock: hasVariants
      ? variants.reduce((total: number, v: any) => total + Number(v.stock || 0), 0)
      : body.stock !== undefined
        ? Number(body.stock)
        : existingProduct.stock,

    // ✅ weightOrVolume — single product এ
    ...(!hasVariants && !isCombo && body.weightOrVolume && {
      weightOrVolume: Number(body.weightOrVolume),
    }),

    // ✅ salePrice
    salePrice: hasVariants
      ? (variants[0]?.salePrice ? Number(variants[0].salePrice) : undefined)
      : body.salePrice !== undefined
        ? Number(body.salePrice)
        : existingProduct.salePrice,

    ...(body.sku && { sku: body.sku }),
    ...(body.lowStockAlert !== undefined && { lowStockAlert: Number(body.lowStockAlert) }),
    ...(body.weight !== undefined && { weight: Number(body.weight) }),
    ...(body.shippingCost !== undefined && { shippingCost: Number(body.shippingCost) }),
    ...(body.shippingClass && { shippingClass: body.shippingClass }),
    ...(body.freeShipping !== undefined && { freeShipping: body.freeShipping === "true" }),
    ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured === "true" }),
    ...(body.isOnSale !== undefined && { isOnSale: body.isOnSale === "true" }),
    ...(body.isNew !== undefined && { isNew: body.isNew === "true" }),
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

  // ৮. thumbnail update
  const thumbnailFiles = files?.thumbnail;
  if (thumbnailFiles && thumbnailFiles[0]) {
    if (existingProduct.thumbnail) {
      const publicId = existingProduct.thumbnail
        .split("/").slice(-2).join("/").replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
    }
    const result: any = await uploadToCloudinary(
      thumbnailFiles[0].buffer,
      "glowly_products/thumbnails",
    );
    updateData.thumbnail = result.secure_url || result.url;
  }

  // ৯. gallery update
  const galleryFiles = files?.images;
  if (galleryFiles && galleryFiles.length > 0) {
    if (existingProduct.images && existingProduct.images.length > 0) {
      await Promise.all(
        existingProduct.images.map((imgUrl: string) => {
          const publicId = imgUrl
            .split("/").slice(-2).join("/").replace(/\.[^/.]+$/, "");
          return cloudinary.uploader.destroy(publicId);
        }),
      );
    }
    const uploadResults: any[] = await Promise.all(
      galleryFiles.map((file: any) =>
        uploadToCloudinary(file.buffer, "glowly_products/gallery"),
      ),
    );
    updateData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  return await Product.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true },
  ).populate("categoryID", "name image");
};

const getAllProductsFromDB = async (query: Record<string, any>) => {
  const {
    searchTerm,
    category,
    productType,
    status,
    isFeatured,
    page = 1,
    limit = 8,

    sort = "-createdAt",
  } = query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const safeLimit = limitNum > 0 ? limitNum : 10;

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
  if (isFeatured !== undefined) matchStage.isFeatured = isFeatured === "true";

  // সমাধান: Facet এর ভেতরের স্টেজগুলোকে 'any' হিসেবে চিহ্নিত করা যাতে টাইপ এরর না আসে
  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    {
      $facet: {
        data: [
          { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          {
            $lookup: {
              from: "categories",
              localField: "categoryID",
              foreignField: "_id",
              as: "categoryID",
            },
          },
          {
            $unwind: { path: "$categoryID", preserveNullAndEmptyArrays: true },
          },
        ] as any, // 👈 এখানে 'as any' ব্যবহার করলে এরর চলে যাবে
        metaCounts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
              },
              inactive: {
                $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
              },
              lowStock: {
                $sum: { $cond: [{ $lte: ["$stock", "$lowStockAlert"] }, 1, 0] },
              },
              featured: { $sum: { $cond: ["$isFeatured", 1, 0] } },
            },
          },
        ] as any, // 👈 এখানে 'as any' ব্যবহার করুন
      },
    },
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
      counts: facetData.metaCounts[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        lowStock: 0,
        featured: 0,
      },
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
  getRelatedProductsFromDB,
  updateProductIntoDB,
  getLowStockProductsFromDB,
};
