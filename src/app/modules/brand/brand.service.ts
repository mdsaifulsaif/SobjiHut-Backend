import mongoose from "mongoose";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Brand } from "./brand.model";


/**
 * ১. ব্র্যান্ড ক্রিয়েট করার সার্ভিস
 */
const createBrandIntoDB = async (payload: any, file: any) => {
  if (!file) throw new Error("Brand logo is required!");

  const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_brands");
  const imageUrl = uploadResult.secure_url || uploadResult.url;

  const isExist = await Brand.findOne({ name: payload.name, isDeleted: false });
  if (isExist) throw new Error("Brand already exists!");

  // ডাটা ফরম্যাটিং
  const finalData = {
    ...payload,
    logo: imageUrl,
    slug: payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    status: payload.status === "active" ? "active" : "inactive",
    isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
    showInHome: payload.showInHome === "true" || payload.showInHome === true,
    showInMenu: payload.showInMenu === "true" || payload.showInMenu === true,
    order: Number(payload.order) || 0,
  };

  return await Brand.create(finalData);
};

const updateBrandInDB = async (id: string, payload: any, file: any) => {
  const brand = await Brand.findById(id);
  if (!brand || brand.isDeleted) throw new Error("Brand not found!");

  // নতুন ইমেজ থাকলে আপডেট
  if (file) {
    const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_brands");
    payload.logo = uploadResult.secure_url;
  }

  // বুলিয়ান এবং অন্যান্য কনভার্সন
  const updateData = {
    ...payload,
    isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
    showInHome: payload.showInHome === "true" || payload.showInHome === true,
    showInMenu: payload.showInMenu === "true" || payload.showInMenu === true,
    order: payload.order ? Number(payload.order) : brand.order,
  };

  return await Brand.findByIdAndUpdate(id, updateData, { new: true });
};

/**
 * ২. সব ব্র্যান্ড গেট করা (পেজিনেশন ও সার্চিংসহ)
 */
const getAllBrandsFromDB = async (query: any) => {
  const { page = 1, limit = 10, searchTerm } = query;
  
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // ১. সার্চিং এবং ফিল্টারিং স্টেজ
  const matchStage: any = { isDeleted: false };
  if (searchTerm) {
    matchStage.name = { $regex: searchTerm, $options: "i" };
  }

  // ২. মেইন অ্যাগ্রিগেশন পাইপলাইন
  const data = await Brand.aggregate([
    { $match: matchStage }, // সার্চ ফিল্টার প্রয়োগ
    {
      $lookup: {
        from: "products", 
        localField: "_id",
        foreignField: "brand",
        as: "products"
      }
    },
    {
      $addFields: {
        productCount: { $size: "$products" }
      }
    },
    { $project: { products: 0 } }, 
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limitNum }
  ]);

  // ৩. সার্চ রেজাল্টের ওপর ভিত্তি করে সঠিক টোটাল কাউন্ট
  // Brand.countDocuments(matchStage) এর পরিবর্তে aggregate এর $count ব্যবহার করা নিরাপদ
  const totalResult = await Brand.aggregate([
    { $match: matchStage },
    { $count: "total" }
  ]);

  const total = totalResult.length > 0 ? totalResult[0].total : 0;

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage: Math.ceil(total / limitNum),
    },
    data,
  };
};


const getSingleBrandFromDB = async (id: string) => {
  const result = await Brand.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: false } }, // আইডি দিয়ে ফিল্টার
    {
      $lookup: {
        from: "products", // আপনার প্রোডাক্ট কালেকশনের নাম
        localField: "_id",
        foreignField: "brand", // প্রোডাক্ট মডেলে ব্র্যান্ড রেফারেন্স ফিল্ড
        as: "products"
      }
    },
    {
      $addFields: {
        productCount: { $size: "$products" } // ব্র্যান্ডের প্রোডাক্ট সংখ্যা
      }
    },
    { $project: { products: 0 } } // প্রোডাক্ট ডিটেইলস বাদ দিয়ে শুধু সংখ্যা রাখা
  ]);

  if (!result || result.length === 0) {
    throw new Error("Brand not found!");
  }

  return result[0]; // যেহেতু অ্যাগ্রিগেশন অ্যারে রিটার্ন করে, তাই প্রথমটি নিলেই হবে
};

/**
 * ৪. ব্র্যান্ড ডিলিট (সফট ডিলিট)
 */
const deleteBrandFromDB = async (id: string) => {
  const result = await Brand.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!result) throw new Error("Brand not found!");
  return result;
};




export const BrandServices = {
  createBrandIntoDB,
  getAllBrandsFromDB,
  getSingleBrandFromDB,
  updateBrandInDB,
  deleteBrandFromDB,
};