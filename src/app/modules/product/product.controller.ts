import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { getNewProductsService, ProductServices } from "./product.service";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Product } from "./product.model";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";



const createProduct = catchAsync(async (req: Request, res: Response) => {
  // বডি এবং ফাইল সরাসরি সার্ভিসে পাঠানো হচ্ছে
  const result = await ProductServices.createProductIntoDB(req.body, req.files);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Product created successfully!",
    data: result,
  });
});



const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ProductServices.updateProductIntoDB(id as string, req.body, req.files); // ProductServices থেকে call করুন

    res.status(200).json({
      success: true,
      message: 'Product updated successfully!',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Something went wrong',
    });
  }
};


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
