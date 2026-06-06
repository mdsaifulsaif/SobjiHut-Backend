import { ICategory } from "./category.interface";
import { Category } from "./category.model";
import { Product } from "../product/product.model";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";


const createCategoryIntoDB = async (payload: any, file: any) => {
  // Partial<ICategory> এর বদলে temporary any দিন টেস্টের জন্য
  if (!file) {
    throw new Error("Category image is required!");
  }

  const uploadResult: any = await uploadToCloudinary(
    file.buffer,
    "glowly_categories",
  );
  payload.image = uploadResult.secure_url || uploadResult.url;

  const isExist = await Category.findOne({
    name: payload.name,
    isDeleted: false,
  });

  if (isExist) {
    throw new Error("Category already exists!");
  }

  // ডাটা ক্লিনিং এবং ফরম্যাটিং (এই অংশটি ডাটা মিস হওয়া আটকাবে)
  const finalData = {
    name: payload.name,
    slug:
      payload.slug ||
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, ""),
    description: payload.description || "",
    parentCategory:
      payload.parentCategory === "" ? null : payload.parentCategory,
    icon: payload.icon || "",
    image: payload.image,
    banner: payload.banner || "",
    // পোস্টম্যান থেকে "true" (string) আসলে সেটাকে true (boolean) করা
    status:
      payload.status === "ture" || payload.status === "active"
        ? "active"
        : "inactive",
    order: payload.order ? Number(payload.order) : 0,
    isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
    showInHome: payload.showInHome === "true" || payload.showInHome === true,
    showInMenu: payload.showInMenu === "true" || payload.showInMenu === true,
    metaTitle: payload.metaTitle || "",
    metaDescription: payload.metaDescription || "",
  };

  // এবার সরাসরি finalData সেভ করুন
  const result = await Category.create(finalData);
  return result;
};

const getAllCategoriesFromDB = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const data = await Category.find({ isDeleted: false }) //  filter
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Category.countDocuments({ isDeleted: false });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

const deleteCategoryFromDB = async (id: string) => {
  const result = await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  return result;
};

const getProductsByCategoryFromDB = async (
  categoryId: string,
  page: number,
  limit: number,
) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: false,
  });

  if (!category) {
    throw new Error("Category not found or deleted!");
  }

  const skip = (page - 1) * limit;

  const data = await Product.find({
    categoryID: categoryId,
  })
    .skip(skip)
    .limit(limit)
    .populate("categoryID");

  const total = await Product.countDocuments({
    categoryID: categoryId,
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

export const CategoryServices = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  deleteCategoryFromDB,
  getProductsByCategoryFromDB,
};
