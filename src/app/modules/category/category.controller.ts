import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CategoryServices } from "./category.service";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";
import { Category } from "./category.model"; 


// const createCategory = catchAsync(async (req: Request, res: Response) => {
//   let categoryData = { ...req.body };

//   if (req.file) {
//     const result: any = await uploadToCloudinary(
//       req.file.buffer,
//       "glowly_categories",
//     );

//     categoryData.image = result.secure_url || result.url;
//   } else {
//     throw new Error("Category image is required!");
//   }

//   const result = await CategoryServices.createCategoryIntoDB(categoryData);

//   sendResponse(res, {
//     statusCode: 201,
//     success: true,
//     message: "Category created successfully!",
//     data: result,
//   });
// });

const createCategory = catchAsync(async (req: Request, res: Response) => {
  // ফাইল এবং বডির ডাটা সার্ভিসে পাঠানো হচ্ছে
  const result = await CategoryServices.createCategoryIntoDB(req.body, req.file);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Category created successfully!",
    data: result,
  });
});




const getCategories = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await CategoryServices.getAllCategoriesFromDB(page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Categories retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) throw new Error("Category ID is required!");

  const category = await Category.findById(id);

  if (!category || category.isDeleted) {
    throw new Error("Category not found!");
  }

  await CategoryServices.deleteCategoryFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category deleted successfully!",
    data: null,
  });
});


const getCategoryByProducts = catchAsync(async (req: Request, res:Response)=>{
  const {id} = req.params

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

const result = await CategoryServices.getProductsByCategoryFromDB(id as string, page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products retrieved by category successfully!",
    meta: result.meta,
    data: result.data,
  });

})


export const CategoryControllers = {
  createCategory,
  getCategories,
  deleteCategory,
  getCategoryByProducts
};
