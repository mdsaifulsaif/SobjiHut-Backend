// order.service.ts
import { Order } from "./order.model";
import { Product } from "../product/product.model";
import { IOrder } from "./order.interface";
import { calculateShipping } from "./order.config";

const createOrderIntoDB = async (userID: string, payload: any) => {
  const {
    items,
    deliveryType,
    deliveryAddress,
    paymentMethod,
    preferredDeliveryTime,
    couponCode,
    specialInstructions,
    isGift,
    giftNote,
  } = payload;

  if (!items || items.length === 0) {
    throw new Error("Order must have at least one item!");
  }

  // ১. প্রতিটি item validate + price fetch from DB (client price trust করবো না)
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productID).populate("unit");
    if (!product) throw new Error(`Product not found: ${item.productID}`);
    if (product.status !== "active")
      throw new Error(`Product unavailable: ${product.name}`);

    let unitPrice = product.regularPrice;
    let salePrice = product.salePrice;
    let sku = product.sku;
    let unit = (product.unit as any)?.name || "pcs";

    // variant থাকলে variant-এর দাম নেবো
    if (item.variantIndex !== undefined && product.variants?.length) {
      const variant = product.variants[item.variantIndex];
      if (!variant) throw new Error(`Variant not found for: ${product.name}`);
      if (variant.stock < item.quantity)
        throw new Error(
          `Insufficient stock for variant: ${variant.variantName}`,
        );

      unitPrice = variant.regularPrice;
      salePrice = variant.salePrice;
      sku = variant.sku;
    } else {
      // stock check
      if (product.stock < item.quantity)
        throw new Error(`Insufficient stock for: ${product.name}`);
    }

    const effectivePrice = salePrice || unitPrice;
    const totalPrice = effectivePrice * item.quantity;
    subtotal += totalPrice;

    orderItems.push({
      productID: product._id,
      variantIndex: item.variantIndex,
      productName: product.name,
      thumbnail: product.thumbnail,
      sku,
      quantity: item.quantity,
      unit,
      unitPrice,
      salePrice,
      totalPrice,
    });
  }

  // ২. Shipping calculate
  const shippingCharge = calculateShipping(deliveryType, subtotal);

  // ৩. Coupon (এখন simple, পরে coupon module যোগ করবে)
  let couponDiscount = 0;
  // TODO: coupon validation logic পরে আসবে

  const discountAmount = couponDiscount; // এখন শুধু coupon discount
  const totalAmount = subtotal - discountAmount + shippingCharge;

  // ৪. Estimated delivery date
  const estimatedDays = deliveryType === "local" ? 0 : 3;
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDays);

  const orderData: Partial<IOrder> = {
    userID: userID as any,
    items: orderItems,
    subtotal,
    discountAmount,
    couponCode,
    couponDiscount,
    shippingCharge,
    totalAmount,
    deliveryType,
    deliveryAddress,
    preferredDeliveryTime,
    estimatedDelivery,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "unpaid" : "unpaid",
    specialInstructions,
    isGift,
    giftNote,
  };

  const order = await Order.create(orderData);

  // ৫. Stock deduct (order confirmed হলে করবে, এখন pending-তেই করছি)
  // পরে এটা "confirmed" status-এ move করতে পারো
  for (const item of items) {
    if (item.variantIndex !== undefined) {
      await Product.findByIdAndUpdate(item.productID, {
        $inc: { [`variants.${item.variantIndex}.stock`]: -item.quantity },
      });
    } else {
      await Product.findByIdAndUpdate(item.productID, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  return order;
};

const getMyOrdersFromDB = async (userID: string, query: any) => {
  const { page = 1, limit = 10, status } = query;
  const filter: any = { userID, ...(status && { status }) };

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .select("-statusTimeline"); // list-এ timeline দরকার নেই

  const total = await Order.countDocuments(filter);

  return { orders, total, page: Number(page), limit: Number(limit) };
};

const getSingleOrderFromDB = async (orderID: string, userID: string) => {
  const order = await Order.findOne({ _id: orderID, userID }).populate(
    "items.productID",
    "name thumbnail slug",
  );
  if (!order) throw new Error("Order not found!");
  return order;
};

const cancelOrderByUser = async (
  orderID: string,
  userID: string,
  reason: string,
) => {
  const order = await Order.findOne({ _id: orderID, userID });
  if (!order) throw new Error("Order not found!");

  const cancellableStatuses = ["pending", "confirmed"];
  if (!cancellableStatuses.includes(order.status)) {
    throw new Error(`Cannot cancel order in '${order.status}' status`);
  }

  order.status = "cancelled";
  order.cancelReason = reason;
  order.cancelledBy = "user";
  order.statusTimeline.push({
    status: "cancelled",
    changedAt: new Date(),
    note: reason,
  });

  // stock ফেরত দেওয়া
  for (const item of order.items) {
    if (item.variantIndex !== undefined) {
      await Product.findByIdAndUpdate(item.productID, {
        $inc: { [`variants.${item.variantIndex}.stock`]: item.quantity },
      });
    } else {
      await Product.findByIdAndUpdate(item.productID, {
        $inc: { stock: item.quantity },
      });
    }
  }

  await order.save();
  return order;
};

// Admin: সব অর্ডার দেখবে + filter
const getAllOrdersFromDB = async (query: any) => {
  const { page = 1, limit = 20, status, deliveryType, from, to } = query;

  const filter: any = {};
  if (status) filter.status = status;
  if (deliveryType) filter.deliveryType = deliveryType;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("userID", "name phone email");

  const total = await Order.countDocuments(filter);
  return { orders, total, page: Number(page), limit: Number(limit) };
};

// Admin: status update
const updateOrderStatusByAdmin = async (
  orderID: string,
  status: string,
  note: string,
  adminID: string,
) => {
  const order = await Order.findById(orderID);
  if (!order) throw new Error("Order not found!");

  order.status = status as any;
  order.statusTimeline.push({
    status: status as any,
    changedAt: new Date(),
    note,
    changedBy: adminID as any,
  });

  await order.save();
  return order;
};

export const OrderServices = {
  createOrderIntoDB,
  getMyOrdersFromDB,
  getSingleOrderFromDB,
  cancelOrderByUser,
  getAllOrdersFromDB,
  updateOrderStatusByAdmin,
};
