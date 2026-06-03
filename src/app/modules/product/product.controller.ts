import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { getNewProductsService, ProductServices } from "./product.service";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Product } from "./product.model";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";



const createProduct = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const { name, shortDescription, description, costPrice, regularPrice, categoryID, stock } =
    req.body;

    console.log(req.body)

  //  1. Required field check
  if (
    !name ||
    !shortDescription ||
    !costPrice ||
    !regularPrice ||
    !categoryID ||
    stock === undefined
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide all required fields: name, shortDescription, costPrice, regularPrice, categoryID, and stock.",
    });
  }

  //  2. Number validation
  const cost = Number(costPrice);
  const regular = Number(regularPrice);
  const qty = Number(stock);
  const sale = req.body.salePrice ? Number(req.body.salePrice) : undefined;

  if (cost <= 0 || regular <= 0) {
    return res.status(400).json({
      success: false,
      message: "Prices must be greater than zero.",
    });
  }

  if (sale && sale >= regular) {
    return res.status(400).json({
      success: false,
      message: "Sale price must be less than regular price.",
    });
  }

  //  3. Parse JSON fields safely
  let tags: string[] = [];
  let lowdown: string[] = [];

  try {
    if (req.body.tags) tags = JSON.parse(req.body.tags);
    if (req.body.lowdown) lowdown = JSON.parse(req.body.lowdown);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format for tags or lowdown.",
    });
  }

  //  4. Build clean payload (ONLY allowed fields)
  let productData: any = {
    name,
    shortDescription,
    description,
    categoryID,

    costPrice: cost,
    regularPrice: regular,
    salePrice: sale,

    stock: qty,

    brand: req.body.brand || undefined,
    tags,
    lowdown,

    weight: req.body.weight ? Number(req.body.weight) : undefined,
    freeShipping: req.body.freeShipping === "true",

    isFeatured: req.body.isFeatured === "true",
    isNew: req.body.isNew !== "false",

    status: req.body.status || "active",

    metaTitle: req.body.metaTitle,
    metaDescription: req.body.metaDescription,

    // dimensions parse
    dimensions: {
      length: req.body.length ? Number(req.body.length) : undefined,
      width: req.body.width ? Number(req.body.width) : undefined,
      height: req.body.height ? Number(req.body.height) : undefined,
    },
  };

  //  5. Thumbnail upload (unchanged as you wanted)
  if (files && files.thumbnail && files.thumbnail[0]) {
    const result: any = await uploadToCloudinary(
      files.thumbnail[0].buffer,
      "glowly_products/thumbnails",
    );
    productData.thumbnail = result.secure_url || result.url;
  } else {
    return res.status(400).json({
      success: false,
      message: "Product thumbnail is required!",
    });
  }

  //  6. Multiple images upload
  if (files && files.images && files.images.length > 0) {
    const uploadPromises = files.images.map((file) =>
      uploadToCloudinary(file.buffer, "glowly_products/gallery"),
    );

    const uploadResults: any[] = await Promise.all(uploadPromises);
    productData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  //  7. Call service
  const result = await ProductServices.createProductIntoDB(productData);

  //  8. Response
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Product created successfully!",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const updateData: any = { ...req.body };

  //  Number convert
  if (req.body.costPrice) updateData.costPrice = Number(req.body.costPrice);
  if (req.body.regularPrice) updateData.regularPrice = Number(req.body.regularPrice);
  if (req.body.stock) updateData.stock = Number(req.body.stock);
  if (req.body.weight) updateData.weight = Number(req.body.weight);

  //  salePrice safe handling
  if (req.body.salePrice) {
    if (isNaN(Number(req.body.salePrice))) {
      return res.status(400).json({
        success: false,
        message: "Sale price must be a valid number",
      });
    }
    updateData.salePrice = Number(req.body.salePrice);
  }

  //  JSON parse
  try {
    if (req.body.tags) updateData.tags = JSON.parse(req.body.tags);
    if (req.body.lowdown) updateData.lowdown = JSON.parse(req.body.lowdown);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format (tags/lowdown)",
    });
  }

  // ✅ Boolean fix
  if (req.body.freeShipping !== undefined)
    updateData.freeShipping = req.body.freeShipping === "true";

  if (req.body.isFeatured !== undefined)
    updateData.isFeatured = req.body.isFeatured === "true";

  if (req.body.isNew !== undefined)
    updateData.isNew = req.body.isNew === "true";

  //  Thumbnail update (optional)
  if (files?.thumbnail?.[0]) {
    const result: any = await uploadToCloudinary(
      files.thumbnail[0].buffer,
      "glowly_products/thumbnails"
    );
    updateData.thumbnail = result.secure_url || result.url;
  }

  //  Images update (optional → overwrite)
  if (files?.images?.length > 0) {
    const uploadPromises = files.images.map((file) =>
      uploadToCloudinary(file.buffer, "glowly_products/gallery")
    );

    const uploadResults: any[] = await Promise.all(uploadPromises);
    updateData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  //  Service call
  const result = await ProductServices.updateProductIntoDB(id as string, updateData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product updated successfully!",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductServices.getAllProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const getProductsController = async (req: Request, res: Response) => {
  try {
    const products = await getNewProductsService({
      isNew: req.query.isNew as string,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductServices.getSingleProductFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product retrieved successfully!",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Product not found!");
  }

  if (product.thumbnail) {
    const thumbPublicId = product.thumbnail.split("/").pop()?.split(".")[0];
    if (thumbPublicId) {
      await deleteFromCloudinary(`glowly_products/thumbnails/${thumbPublicId}`);
    }
  }

  if (product.images && product.images.length > 0) {
    const deletePromises = product.images.map((imgUrl) => {
      const imgPublicId = imgUrl.split("/").pop()?.split(".")[0];
      return imgPublicId
        ? deleteFromCloudinary(`glowly_products/gallery/${imgPublicId}`)
        : Promise.resolve();
    });
    await Promise.all(deletePromises);
  }

  await ProductServices.deleteProductFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product and associated images deleted successfully!",
    data: null,
  });
});

const getBestsellingProducts = catchAsync(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 4;

    const result = await ProductServices.getBestsellingProductsFromDB(limit);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Bestselling products retrieved successfully!",
      data: result,
    });
  },
);

const getRelatedProducts = catchAsync(async (req: Request, res: Response) => {
  const { categoryId, productId } = req.query; // Query theke nilam

  const result = await ProductServices.getRelatedProductsFromDB(
    categoryId as string,
    productId as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Related products retrieved successfully!",
    data: result,
  });
});


const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const result = await ProductServices.getLowStockProductsFromDB();

    res.status(200).json({
      success: true,
      message: "Low stock products fetched based on their alerts",
      count: result.length,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
      error: error,
    });
  }
};

export const ProductControllers = {
  createProduct,
  getAllProducts,
  deleteProduct,
  getSingleProduct,
  getBestsellingProducts,
  getRelatedProducts,
  updateProduct,
  getLowStockProducts
};
