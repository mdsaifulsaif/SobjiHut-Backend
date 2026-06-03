import { Order } from "./order.model";

import { User } from "../auth/user.model";
import mongoose from "mongoose";
import { Product } from "../product/product.model";

// const createOrderIntoDB = async (orderData: any) => {
//   const result = await Order.create(orderData);
//   return result;
// };

const createOrderIntoDB = async (orderData: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // crate order
    const [result] = await Order.create([orderData], { session });

    // sotck komano hocche
    const updateStockPromises = result.cartItems.map((item: any) => {
      return Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { session, new: true }
      );
    });

    await Promise.all(updateStockPromises);

    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(error.message || "Failed to place order");
  }
};

const getMyOrdersFromDB = async (userId: string) => {
  const result = await Order.find({ user: userId }).sort("-createdAt");
  return result;
};

const getAllOrdersForAdmin = async () => {
  return await Order.find().populate("user").sort("-createdAt");
};

// const updateOrderStatusInDB = async (orderId: string, status: string) => {
//   return await Order.findByIdAndUpdate(orderId, { status }, { new: true });
// };

const updateOrderStatusInDB = async (orderId: string, status: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    const oldStatus = order.status;

   
    if (status === "Cancelled" && oldStatus !== "Cancelled") {
      const restoreStockPromises = order.cartItems.map((item: any) => {
        return Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }, // স্টক ফিরিয়ে দেওয়া (+ করা)
          { session, new: true }
        );
      });
      await Promise.all(restoreStockPromises);
    }
    

    const result = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(error.message || "Failed to update status");
  }
};

const getSingleOrderFromDB = async (orderId: string, userId: string) => {
  const result = await Order.findOne({ _id: orderId, user: userId }).populate(
    "cartItems.product",
  );
  return result;
};

const getAllOrdersFromDB = async (
  page: number,
  limit: number,
  search: string,
) => {
  const skip = (page - 1) * limit;

  const query = search
    ? {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // সবগুলো স্ট্যাটাস কাউন্ট বের করা
  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
  ] = await Promise.all([
    Order.countDocuments(query),
    Order.countDocuments({ status: "Pending" }),
    Order.countDocuments({ status: "Processing" }),
    Order.countDocuments({ status: "Shipped" }),
    Order.countDocuments({ status: "Delivered" }),
    Order.countDocuments({ status: "Cancelled" }),
  ]);

  const totalPages = Math.ceil(totalOrders / limit);

  return {
    orders,
    stats: {
      total: totalOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },
    pagination: {
      totalOrders,
      totalPages,
      currentPage: page,
    },
  };
};

const getAdminSingleOrderFromDB = async (orderId: string) => {
  const result = await Order.findById(orderId)
    .populate("user", "firstName lastName email phone")
    .lean();
  return result;
};

// dashboard overview
export const getDashboardStatsFromDB = async () => {
  // ১. রেভিনিউ এবং টোটাল অর্ডার স্ট্যাটস (Aggregation)
  const stats = await Order.aggregate([
    {
      $facet: {
        totalRevenue: [
          { $match: { status: "Delivered" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ],
        totalOrders: [{ $count: "count" }],
        avgValue: [{ $group: { _id: null, avg: { $avg: "$totalAmount" } } }],
      },
    },
  ]);

  const revenue = stats[0].totalRevenue[0]?.total || 0;
  const ordersCount = stats[0].totalOrders[0]?.count || 0;
  const avgOrderValue = stats[0].avgValue[0]?.avg || 0;
  const customersCount = await User.countDocuments({ role: "user" });

  
  const salesData = await Order.aggregate([
    {
      $group: {
        _id: { $month: "$createdAt" },
        value: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 6 },
  ]);

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const formattedSales = salesData.map((item) => ({
    name: monthNames[item._id - 1],
    value: item.value,
  }));

  // ৩. রিসেন্ট অর্ডার ও টপ পারফর্মিং প্রোডাক্ট
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("user", "firstName lastName");

  const topProducts = await Order.aggregate([
    { $unwind: "$cartItems" },
    {
      $group: {
        _id: "$cartItems.productId",
        name: { $first: "$cartItems.name" },
        img: { $first: "$cartItems.image" },
        sales: { $sum: "$cartItems.quantity" },
        revenue: {
          $sum: { $multiply: ["$cartItems.price", "$cartItems.quantity"] },
        },
      },
    },
    { $sort: { sales: -1 } },
    { $limit: 5 },
  ]);

  return {
    revenue,
    ordersCount,
    customersCount,
    avgOrderValue,
    formattedSales,
    recentOrders,
    topProducts,
  };
};

export const OrderServices = {
  createOrderIntoDB,
  getMyOrdersFromDB,
  getAllOrdersForAdmin,
  updateOrderStatusInDB,
  getSingleOrderFromDB,
  getAllOrdersFromDB,
  getAdminSingleOrderFromDB,
  getDashboardStatsFromDB
};
