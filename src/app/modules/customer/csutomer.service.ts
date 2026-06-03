import { IUser } from "../auth/user.interface";
import { User } from '../auth/user.model';



// const getAllCustomersFromDB = async (query: Record<string, any>) => {
//   const { page = 1, limit = 10 } = query; 
//   const skip = (Number(page) - 1) * Number(limit);

//   //  card status count
//   const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
//   const stats = await User.aggregate([
//     { $match: { role: 'user' } },
//     {
//       $group: {
//         _id: null,
//         totalCustomers: { $sum: 1 },
//         active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
//         blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
//         newThisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', firstDayOfMonth] }, 1, 0] } },
//       },
//     },
//   ]);

//   // customer list with paganation
//   const result = await User.find({ role: 'user' })
//     .select('-password')
//     .sort('-createdAt')
//     .skip(skip)
//     .limit(Number(limit));

//   // meta data calculation
//   const total = await User.countDocuments({ role: 'user' });
//   const totalPage = Math.ceil(total / Number(limit));

//   return {
//     meta: { 
//       page: Number(page), 
//       limit: Number(limit), 
//       total, 
//       totalPage 
//     },
//     stats: stats[0] || { totalCustomers: 0, active: 0, blocked: 0, newThisMonth: 0 },
//     data: result, 
//   };
// };

const getAllCustomersFromDB = async (query: Record<string, any>) => {
  const { 
    searchTerm, 
    status, 
    page = 1, 
    limit = 10 
  } = query;

  const skip = (Number(page) - 1) * Number(limit);

  // ১. ফিল্টার অবজেক্ট তৈরি
  const filter: any = { role: 'user' };

  // ২. নাম, ইমেইল বা ফোন নম্বর দিয়ে সার্চ লজিক
  if (searchTerm) {
    filter.$or = [
      { firstName: { $regex: searchTerm, $options: 'i' } },
      { lastName: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { phoneNumber: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // ৩. স্ট্যাটাস অনুযায়ী ফিল্টার (active/blocked)
  if (status && status !== 'all') {
    filter.status = status;
  }

  // ৪. কার্ডের স্ট্যাটাস কাউন্ট (এটি সবসময় মোট কাস্টমারদের ওপর হবে, ফিল্টারের ওপর নয়)
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const stats = await User.aggregate([
    { $match: { role: 'user' } },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
        newThisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', firstDayOfMonth] }, 1, 0] } },
      },
    },
  ]);

  // ৫. ফিল্টার অনুযায়ী কাস্টমার লিস্ট এবং পেজিনেশন
  const result = await User.find(filter)
    .select('-password')
    .sort('-createdAt')
    .skip(skip)
    .limit(Number(limit));

  // ৬. মেটা ডাটা ক্যালকুলেশন (ফিল্টার করা ডাটার ওপর ভিত্তি করে)
  const total = await User.countDocuments(filter);
  const totalPage = Math.ceil(total / Number(limit));

  return {
    meta: { 
      page: Number(page), 
      limit: Number(limit), 
      total, 
      totalPage 
    },
    stats: stats[0] || { totalCustomers: 0, active: 0, blocked: 0, newThisMonth: 0 },
    data: result, 
  };
};





const updateCustomerStatusInDB = async (id: string, status: 'active' | 'blocked'): Promise<IUser | null> => {
  return await User.findByIdAndUpdate(id, { status }, { new: true });
};

export const UserServices = {
  getAllCustomersFromDB,
  updateCustomerStatusInDB,
};