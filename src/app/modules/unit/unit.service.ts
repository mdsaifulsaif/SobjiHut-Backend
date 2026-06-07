import mongoose from 'mongoose';
import { IUnit } from './unit.interface';
import { Unit } from './unit.model';

// ১. ইউনিট তৈরি করা
const createUnitIntoDB = async (payload: IUnit) => {
  const result = await Unit.create(payload);
  return result;
};

// ২. পেজিনেশন ও সার্চ সহ সব ইউনিট নিয়ে আসা
const getAllUnitsFromDB = async (query: Record<string, any>) => {
  const { searchTerm, page = 1, limit = 10, sort, ...filterData } = query;

  const filter: any = { isDeleted: false, ...filterData };

  // সার্চ লজিক (নাম অথবা শর্টনেম দিয়ে সার্চ করা যাবে)
  if (searchTerm) {
    filter.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { shortName: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // সর্টিং লজিক
  let sortStr = '-createdAt';
  if (sort) {
    sortStr = sort as string;
  }

  // পেজিনেশন ক্যালকুলেশন
  const skip = (Number(page) - 1) * Number(limit);

  // ডাটা ফেচ করা
  const result = await Unit.find(filter)
    .sort(sortStr)
    .skip(skip)
    .limit(Number(limit));

  // মেটা ডাটা ক্যালকুলেশন
  const total = await Unit.countDocuments(filter);
  const totalPage = Math.ceil(total / Number(limit));

  return {
    meta: { page: Number(page), limit: Number(limit), total, totalPage },
    data: result,
  };
};

const getSingleUnitFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ইনভ্যালিড আইডি ফরম্যাট!");
  }
  const result = await Unit.findById(id);
  if (!result || result.isDeleted) {
    throw new Error("ইউনিটটি খুঁজে পাওয়া যায়নি!");
  }
  return result;
};

// ৩. ইউনিট আপডেট করা
const updateUnitInDB = async (id: string, payload: Partial<IUnit>) => {
  const result = await Unit.findByIdAndUpdate(id, payload, {
    new: true, // আপডেট হওয়া নতুন ডাটা রিটার্ন করবে
    runValidators: true, // স্কিমার রুলস ভ্যালিড করবে
  });
  return result;
};

export const UnitServices = {
  createUnitIntoDB,
  getAllUnitsFromDB,
  getSingleUnitFromDB,
  updateUnitInDB,
};