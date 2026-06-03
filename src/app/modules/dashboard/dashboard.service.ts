import { User } from "../auth/user.model";
import { Order } from "../order/order.model";
import { Product } from "../product/product.model";



export const AnalyticsService = {
  getDashboardStats: async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $facet: {
          revenue: [
            { $match: { status: "Delivered" } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ],
          orders: [{ $count: "count" }],
          newCustomersThisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const totalCustomers = await User.countDocuments({ role: "user" });

    // ১. রেভিনিউ ওভারভিউ
    const revenueOverview = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ২. টপ প্রোডাক্টস
    const topProducts = await Order.aggregate([
      { $unwind: "$cartItems" },
      {
        $group: {
          _id: "$cartItems.product",
          sales: { $sum: "$cartItems.quantity" },
          amount: { $sum: { $multiply: ["$cartItems.price", "$cartItems.quantity"] } },
        },
      },
      { $sort: { sales: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
    ]);

    // ৩. Sales by Category (নতুন যুক্ত করা হয়েছে)
    const salesByCategory = await Order.aggregate([
      { $unwind: "$cartItems" },
      {
        $lookup: {
          from: "products",
          localField: "cartItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories", // আপনার ক্যাটাগরি কালেকশনের নাম চেক করুন
          localField: "productDetails.categoryID",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.name",
          value: { $sum: 1 }, // কতবার এই ক্যাটাগরির প্রোডাক্ট সেল হয়েছে
        },
      },
      { $project: { category: "$_id", value: 1, _id: 0 } }
    ]);

    // ৪. সিটি ভিত্তিক ডিস্ট্রিবিউশন
    const ordersByCity = await Order.aggregate([
      {
        $group: {
          _id: "$shippingAddress.city",
          orders: { $sum: 1 },
        },
      },
      { $sort: { orders: -1 } },
    ]);

    // ৫. Recent Activity (অর্ডার এবং ইউজার কম্বাইন করে)
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("firstName lastName totalAmount status createdAt");

    const recentUsers = await User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .limit(2)
      .select("name createdAt");

    // অ্যাক্টিভিটি ফরম্যাট করা
    const activities = [
      ...recentOrders.map(order => ({
        id: order._id,
        type: "order",
        message: `New order from ${order.firstName} ${order.lastName}`,
        time: order.createdAt,
        status: order.status
      })),
      ...recentUsers.map(user => ({
        id: user._id,
        type: "customer",
        message: `New customer ${user.name} registered`,
        time: user.createdAt
      }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime());

    return {
      stats: {
        totalRevenue: stats[0].revenue[0]?.total || 0,
        totalOrders: stats[0].orders[0]?.count || 0,
        totalCustomers,
        newThisMonth: stats[0].newCustomersThisMonth[0]?.count || 0,
      },
      revenueOverview,
      topProducts,
      salesByCategory,
      ordersByCity,
      recentActivity: activities.slice(0, 5) // টপ ৫ অ্যাক্টিভিটি
    };
  },
};


export const getDashboardStatsFromDB = async (startDate?: string, endDate?: string) => {
  const now = new Date();
  
  // last 30 day
  const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : now;

  
  const diffInMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - diffInMs);
  const prevEnd = start;

  const statsFacet = await Order.aggregate([
    {
      $facet: {
       
        currentPeriod: [
          { $match: { createdAt: { $gte: start, $lte: end } } },
          {
            $group: {
              _id: null,
              revenue: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, "$totalAmount", 0] } },
              orders: { $sum: 1 },
              avgOrderValue: { $avg: "$totalAmount" }
            }
          }
        ],
        
        prevPeriod: [
          { $match: { createdAt: { $gte: prevStart, $lte: prevEnd } } },
          {
            $group: {
              _id: null,
              revenue: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, "$totalAmount", 0] } },
              orders: { $sum: 1 }
            }
          }
        ],
        totalCustomers: [{ $count: "count" }],
        lastMonthCustomers: [
          { $match: { createdAt: { $lt: start } } },
          { $count: "count" }
        ],
        orderStatusBreakdown: [
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]
      }
    }
  ]);

  const current = statsFacet[0].currentPeriod[0] || { revenue: 0, orders: 0, avgOrderValue: 0 };
  const prev = statsFacet[0].prevPeriod[0] || { revenue: 0, orders: 0 };
  
  const calculateGrowth = (curr: number, p: number) => 
    p === 0 ? 100 : parseFloat(((curr - p) / p * 100).toFixed(1));

  // ৩. Low Stock Products
  const lowStockCount = await Product.countDocuments({ stock: { $lt: 5 } });

  // ৪. Revenue Overview 
  const monthlyRevenue = await Order.aggregate([
    { $match: { status: "Delivered", createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $month: "$createdAt" },
        revenue: { $sum: "$totalAmount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedRevenue = monthNames.map((name, index) => {
    const found = monthlyRevenue.find(m => m._id === index + 1);
    return { name, revenue: found ? found.revenue : 0 };
  });

  // ৫. Sales by Category (no change)
  const categoryStats = await Order.aggregate([
    { $unwind: "$cartItems" },
    { $lookup: { from: "products", localField: "cartItems.product", foreignField: "_id", as: "p" } },
    { $unwind: "$p" },
    { $lookup: { from: "categories", localField: "p.categoryID", foreignField: "_id", as: "c" } },
    { $unwind: "$c" },
    { $group: { _id: "$c.name", count: { $sum: 1 } } }
  ]);

  const totalCatSales = categoryStats.reduce((acc, curr) => acc + curr.count, 0);
  const salesByCategory = categoryStats.map(cat => ({
    category: cat._id,
    value: totalCatSales > 0 ? Math.round((cat.count / totalCatSales) * 100) : 0
  }));

  // ৬. Orders by City (no change)
  const cityStats = await Order.aggregate([
    { $group: { _id: "$shippingAddress.city", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const totalOrdersCount = cityStats.reduce((acc, curr) => acc + curr.count, 0);
  const ordersByCity = cityStats.map(city => ({
    city: city._id || "Unknown",
    orders: city.count,
    percentage: totalOrdersCount > 0 ? Math.round((city.count / totalOrdersCount) * 100) : 0
  }));

  // ৭. Top 5 Products (no change)
  const topProducts = await Order.aggregate([
    { $unwind: "$cartItems" },
    {
      $group: {
        _id: "$cartItems.product",
        sales: { $sum: "$cartItems.quantity" },
        amount: { $sum: { $multiply: ["$cartItems.price", "$cartItems.quantity"] } }
      }
    },
    { $sort: { sales: -1 } },
    { $limit: 5 },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "info" } },
    { $unwind: "$info" }
  ]);

  const statusSummary = statsFacet[0].orderStatusBreakdown.reduce((acc: any, curr: any) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const deliveredOrders = statusSummary["Delivered"] || 0;

  // ৮. Recent Orders (সর্বশেষ ৫টি অর্ডার)
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'name email'); // যদি ইউজারের নাম দেখাতে চান

  return {
    revenue: { value: current.revenue, growth: calculateGrowth(current.revenue, prev.revenue) },
    orders: { value: current.orders, growth: calculateGrowth(current.orders, prev.orders) },
    customers: { value: statsFacet[0].totalCustomers[0]?.count || 0, growth: calculateGrowth(statsFacet[0].totalCustomers[0]?.count, statsFacet[0].lastMonthCustomers[0]?.count) },
    avgOrderValue: { value: current.avgOrderValue, growth: 4.1 },
    
    lowStockCount,
    orderStatusCounts: {
      pending: statusSummary["Pending"] || 0,
      shipped: statusSummary["Shipped"] || 0,
      delivered: deliveredOrders,
      cancelled: statusSummary["Cancelled"] || 0,
      processing: statusSummary["Processing"] || 0
    },
    orderSuccessRate: current.orders > 0 ? parseFloat(((deliveredOrders / current.orders) * 100).toFixed(1)) : 0,

    formattedRevenue,
    salesByCategory,
    ordersByCity,
    topProducts,
    recentOrders
  };
};