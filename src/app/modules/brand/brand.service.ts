import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Brand } from "./brand.model";


/**
 * ১. ব্র্যান্ড ক্রিয়েট করার সার্ভিস
 */
const createBrandIntoDB = async (payload: any, file: any) => {
  if (!file) throw new Error("Brand logo is required!");

  // ১. ক্লাউডিনারিতে আপলোড করুন
  const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_brands");
  
  // ২. ইউআরএলটি পান
  const imageUrl = uploadResult.secure_url || uploadResult.url;

  const isExist = await Brand.findOne({ name: payload.name, isDeleted: false });
  if (isExist) throw new Error("Brand already exists!");

  // ৩. এখানে লোগোর জায়গায় imageUrl টি বসান
  const finalData = {
    ...payload,
    slug: payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    logo: imageUrl, // 👈 নিশ্চিত করুন এটি এখানে আছে
    status: payload.status === "active" ? "active" : "inactive",
    isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
  };

  return await Brand.create(finalData);
};

/**
 * ২. সব ব্র্যান্ড গেট করা (পেজিনেশন ও সার্চিংসহ)
 */
const getAllBrandsFromDB = async (query: any) => {
  const { page = 1, limit = 10, searchTerm } = query;
  
  const queryObj: any = { isDeleted: false };

  // সার্চিং লজিক
  if (searchTerm) {
    queryObj.name = { $regex: searchTerm, $options: "i" };
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Brand.countDocuments(queryObj);

  const data = await Brand.find(queryObj)
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 });

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

/**
 * ৩. ব্র্যান্ড আপডেট করার সার্ভিস
 */
const updateBrandInDB = async (id: string, payload: any, file: any) => {
  const brand = await Brand.findById(id);
  if (!brand || brand.isDeleted) throw new Error("Brand not found!");

  // নতুন ইমেজ থাকলে ক্লাউডিনারিতে আপলোড
  if (file) {
    const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_brands");
    payload.logo = uploadResult.secure_url;
  }

  // আপডেট ডাটা ফরম্যাটিং
  const updateData = {
    ...payload,
    slug: payload.name ? payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : brand.slug,
  };

  return await Brand.findByIdAndUpdate(id, updateData, { new: true });
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
  updateBrandInDB,
  deleteBrandFromDB,
};