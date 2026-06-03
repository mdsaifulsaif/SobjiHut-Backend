import { GetProductsParams, IProduct } from "./product.interface";
import { Product } from "./product.model";
import { Order } from "../order/order.model";
import slugify from "slugify";

export const createProductIntoDB = async (payload: IProduct) => {
  //  1. slug auto generate
  if (payload.name) {
    payload.slug = slugify(payload.name, { lower: true, strict: true });
  }

  //  2. sale price validation
  if (payload.salePrice && payload.salePrice >= payload.regularPrice) {
    throw new Error("Sale price must be less than regular price");
  }

  //  3. discount percent auto calculate
  if (payload.salePrice) {
    payload.discountPercent = Math.round(
      ((payload.regularPrice - payload.salePrice) / payload.regularPrice) * 100,
    );
  } else {
    payload.discountPercent = 0;
  }

  //  4. default status fix
  if (!payload.status) {
    payload.status = "active";
  }

  //  5. SKU fallback (optional)
  if (!payload.sku) {
    payload.sku = `SKU-${Date.now()}`;
  }

  const result = await Product.create(payload);
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
