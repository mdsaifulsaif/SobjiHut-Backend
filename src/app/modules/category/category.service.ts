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

const updateCategoryIntoDB = async (id: string, payload: any, file: any) => {
  // ১. ক্যাটাগরি ডাটাবেজে আছে কি না চেক করো
  const isExist = await Category.findById(id);
  if (!isExist) {
    throw new Error("Category not found!");
  }

  // ২. যদি নতুন ইমেজ ফাইল আসে, তবে ক্লাউডিনারিতে আপলোড করো
  let imageUrl = isExist.image; // ফাইল না আসলে আগের ইমেজটিই থাকবে
  if (file) {
    const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_categories");
    imageUrl = uploadResult.secure_url || uploadResult.url;
  }

  // ৩. আপডেট ডাটা ফরম্যাটিং (আপনার ক্রিয়েট লজিকের মতোই)
  const updateData = {
    name: payload.name || isExist.name,
    slug: payload.slug || isExist.slug,
    description: payload.description !== undefined ? payload.description : isExist.description,
    parentCategory: payload.parentCategory === "" || payload.parentCategory === "null" 
                     ? null 
                     : (payload.parentCategory || isExist.parentCategory),
    icon: payload.icon || isExist.icon,
    image: imageUrl, // নতুন ইমেজ ইউআরএল বা পুরনোটি
    banner: payload.banner || isExist.banner,
    status: (payload.status === "active") ? "active" : "inactive",
    order: payload.order ? Number(payload.order) : isExist.order,
    isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
    showInHome: payload.showInHome === "true" || payload.showInHome === true,
    showInMenu: payload.showInMenu === "true" || payload.showInMenu === true,
    metaTitle: payload.metaTitle || isExist.metaTitle,
    metaDescription: payload.metaDescription || isExist.metaDescription,
  };

  // ৪. ডাটাবেজে আপডেট করো
  const result = await Category.findByIdAndUpdate(id, updateData, { new: true });
  return result;
};

const getSingleCategoryFromDB = async (id: string) => {
  const result = await Category.findById(id);
  
  if (!result) {
    throw new Error("Category not found!");
  }
  
  return result;
};

const getAllCategoriesFromDB = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  // এখানে Category হলো আপনার Category Model
  const data = await Category.aggregate([
    { $match: { isDeleted: false } },
    {
      $lookup: {
        from: "products", // এটি ডাটাবেজের প্রকৃত কালেকশন নেম। MongoDB Compass এ গিয়ে নিশ্চিত করুন কালেকশনের নাম 'products' কিনা।
        localField: "_id",
        foreignField: "categoryID",
        as: "productDetails" // 'products' এর বদলে 'productDetails' নাম দিলাম যাতে কনফিউশন না হয়
      }
    },
    {
      $addFields: {
        productCount: { $size: { $ifNull: ["$productDetails", []] } }
      }
    },
    { $project: { productDetails: 0, __v: 0 } }, // এখানে productDetails ফিল্ডটি রেসপন্স থেকে হাইড করে দিচ্ছি
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);

  const total = await Category.countDocuments({ isDeleted: false });

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data,
  };
};

const deleteCategoryFromDB = async (id: string) => {
  return await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
};

const getProductsByCategoryFromDB = async (
  categoryId: string,
  page: number,
  limit: number,
) => {
  const category = await Category.findOne({ _id: categoryId, isDeleted: false });

  if (!category) {
    throw new Error("Category not found or deleted!");
  }

  const skip = (page - 1) * limit;

  const data = await Product.find({ categoryID: categoryId })
    .skip(skip)
    .limit(limit)
    .populate("categoryID");

  const total = await Product.countDocuments({ categoryID: categoryId });

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
  updateCategoryIntoDB,
  getSingleCategoryFromDB ,
  getAllCategoriesFromDB,
  deleteCategoryFromDB,
  getProductsByCategoryFromDB,

};
