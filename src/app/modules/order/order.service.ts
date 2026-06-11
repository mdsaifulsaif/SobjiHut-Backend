import mongoose, { Types } from "mongoose";
import { Order } from "./order.model";
import { Product } from "../product/product.model";
import { calculateShipping } from "./order.config";
import { IOrder, IOrderItem } from "./order.interface";
import { Unit } from "../unit/unit.model";

// ===================== HELPER: Stock Deduct =====================

const deductStockForItems = async (
  items: IOrderItem[],
  session: mongoose.ClientSession,
) => {
  for (const item of items) {
    const orderItem = item as any;

    if (orderItem.productType === "combo") {
      // ১. কম্বো প্রোডাক্টের নিজের স্টক কমানো
      await Product.findByIdAndUpdate(
        orderItem.productID,
        { $inc: { stock: -orderItem.quantity, reservedStock: -orderItem.quantity } },
        { session }
      );

      // ২. কম্বোর ভেতরকার আইটেমগুলোর স্টক আপডেট করা
      const comboProduct = await Product.findById(orderItem.productID).session(session);
      if (!comboProduct?.comboItems) continue;

      for (const comboItem of comboProduct.comboItems) {
        const totalRequired = (comboItem.quantity || 1) * orderItem.quantity;

        if (comboItem.selectedVariant) {
          // যদি ভ্যারিয়েন্ট হয়
          await Product.findOneAndUpdate(
            { _id: comboItem.productID, "variants._id": comboItem.selectedVariant },
            { 
              $inc: { 
                "variants.$.stock": -totalRequired, // ভ্যারিয়েন্ট স্টক
                stock: -totalRequired              // মেইন প্রোডাক্টের টোটাল স্টক
              } 
            },
            { session }
          );
        } else {
          // যদি সিঙ্গেল প্রোডাক্ট হয়
          await Product.findByIdAndUpdate(
            comboItem.productID,
            { $inc: { stock: -totalRequired } },
            { session }
          );
        }
      }
    } else if (orderItem.variantID) {
      //  VARIANT
      const product = await Product.findById(orderItem.productID).session(session);
      if (!product) continue;

      const vIdx = (product.variants ?? []).findIndex(
        (v: any) => v._id?.toString() === orderItem.variantID?.toString(),
      );

      if (vIdx !== -1) {
        await Product.findByIdAndUpdate(
          orderItem.productID,
          {
            $inc: {
              [`variants.${vIdx}.stock`]: -orderItem.quantity, // variant stock কাটো
              stock: -orderItem.quantity,                       // main stock কাটো
              reservedStock: -orderItem.quantity,               // reserve মুক্ত
            },
          },
          { session },
        );
      }
    } else {
      // ✅ SINGLE
      await Product.findByIdAndUpdate(
        orderItem.productID,
        {
          $inc: {
            stock: -orderItem.quantity,
            reservedStock: -orderItem.quantity,
          },
        },
        { session },
      );
    }
  }
};

// ===================== HELPER: Stock Restore =====================

const restoreStockForItems = async (
  items: IOrderItem[],
  prevStatus: string,
  session: mongoose.ClientSession,
) => {
  for (const item of items) {
    const orderItem = item as any;

    if (orderItem.productType === "combo") {
      const comboProduct = await Product.findById(orderItem.productID).session(session);
      if (!comboProduct?.comboItems) continue;

      // কম্বো মেইন প্রোডাক্টের ক্ষেত্রে
      if (prevStatus === "pending") {
        await Product.findByIdAndUpdate(orderItem.productID, { $inc: { reservedStock: -orderItem.quantity } }, { session });
      } else if (prevStatus === "confirmed") {
        await Product.findByIdAndUpdate(orderItem.productID, { $inc: { stock: orderItem.quantity } }, { session });
      }

      // কম্বো ভেতরের আইটেম
      for (const comboItem of comboProduct.comboItems) {
        const reverseQty = (comboItem.quantity || 1) * orderItem.quantity;
        if (comboItem.selectedVariant) {
          await Product.findOneAndUpdate(
            { _id: comboItem.productID, "variants._id": comboItem.selectedVariant },
            { $inc: { "variants.$.stock": reverseQty, stock: reverseQty } },
            { session }
          );
        } else {
          await Product.findByIdAndUpdate(comboItem.productID, { $inc: { stock: reverseQty } }, { session });
        }
      }

    } else if (orderItem.variantID) {
      if (prevStatus === "pending") {
        await Product.findByIdAndUpdate(orderItem.productID, { $inc: { reservedStock: -orderItem.quantity } }, { session });
      } else if (prevStatus === "confirmed") {
        await Product.findOneAndUpdate(
          { _id: orderItem.productID, "variants._id": orderItem.variantID },
          { $inc: { "variants.$.stock": orderItem.quantity, stock: orderItem.quantity } },
          { session }
        );
      }
    } else {
      // Single Product
      if (prevStatus === "pending") {
        await Product.findByIdAndUpdate(orderItem.productID, { $inc: { reservedStock: -orderItem.quantity } }, { session });
      } else if (prevStatus === "confirmed") {
        await Product.findByIdAndUpdate(orderItem.productID, { $inc: { stock: orderItem.quantity } }, { session });
      }
    }
  }
};

// ===================== CREATE ORDER =====================

const createOrderIntoDB = async (userID: string, payload: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items, deliveryType, deliveryAddress, paymentMethod,
      preferredDeliveryTime, couponCode, specialInstructions, isGift, giftNote,
    } = payload;

    if (!items || items.length === 0) {
      throw new Error("Order must have at least one item!");
    }

    const orderItems: IOrderItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productID)
        .populate("unit")
        .session(session);

      if (!product) throw new Error(`Product not found: ${item.productID}`);
      if (product.status !== "active") throw new Error(`Product unavailable: ${product.name}`);

      let unitPrice = product.regularPrice;
      let salePrice: number | undefined = product.salePrice;
      let sku: string | undefined = product.sku;
      let unit = (product.unit as any)?.shortName || "pcs";
      let weightOrVolume: number | undefined = product.weightOrVolume;
      let variantID: Types.ObjectId | null = null;

      // ===== COMBO =====
      if (product.productType === "combo") {
        const available = product.stock - (product.reservedStock || 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for combo: ${product.name}`);
        }
        unitPrice = product.regularPrice;
        salePrice = product.salePrice;

      // ===== VARIANT =====
      } else if (item.variantID && product.variants?.length) {
        const vIdx = (product.variants ?? []).findIndex(
          (v: any) => v._id?.toString() === item.variantID?.toString(),
        );

        if (vIdx === -1) throw new Error(`Variant not found for: ${product.name}`);

        const variant = product.variants[vIdx] as any;
        const available = variant.stock - (product.reservedStock || 0);

        if (available < item.quantity) {
          throw new Error(`Insufficient stock for variant of: ${product.name}`);
        }

        unitPrice = variant.regularPrice;
        salePrice = variant.salePrice;
        sku = variant.sku || product.sku;
        weightOrVolume = variant.weightOrVolume;
        variantID = variant._id as Types.ObjectId;

        const variantUnit = await Unit.findById(variant.unitID).session(session);
        unit = variantUnit?.shortName || "pcs";

      // ===== SINGLE =====
      } else {
        const available = product.stock - (product.reservedStock || 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for: ${product.name}`);
        }
      }

      const effectivePrice = salePrice && salePrice > 0 ? salePrice : unitPrice;
      const totalPrice = effectivePrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productID: product._id as Types.ObjectId,
        variantID,
        productName: product.name,
        thumbnail: product.thumbnail,
        sku,
        quantity: item.quantity,
        unit,
        weightOrVolume,
        unitPrice,
        salePrice,
        totalPrice,
        productType: product.productType,
      } as IOrderItem);
    }

    const shippingCharge = calculateShipping(deliveryType, subtotal);
    const couponDiscount = 0;
    const totalAmount = subtotal - couponDiscount + shippingCharge;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(
      estimatedDelivery.getDate() + (deliveryType === "local" ? 0 : 3),
    );

    const pendingExpiresAt = new Date();
    pendingExpiresAt.setMinutes(pendingExpiresAt.getMinutes() + 30);

    const orderData: Partial<IOrder> = {
      userID: userID as any,
      items: orderItems,
      subtotal,
      discountAmount: couponDiscount,
      couponCode,
      couponDiscount,
      shippingCharge,
      totalAmount,
      deliveryType,
      deliveryAddress,
      preferredDeliveryTime,
      estimatedDelivery,
      pendingExpiresAt,
      paymentMethod,
      paymentStatus: "unpaid",
      specialInstructions,
      isGift,
      giftNote,
    };

    const [order] = await Order.create([orderData], { session });

    // ✅ শুধু reservedStock বাড়াও
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.productID,
        { $inc: { reservedStock: item.quantity } },
        { session },
      );
    }

    await session.commitTransaction();
    return order;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ===================== ADMIN STATUS UPDATE =====================
const updateOrderStatusByAdmin = async (
  orderID: string,
  status: string,
  note: string,
  adminID: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderID).session(session);
    if (!order) throw new Error("Order not found!");

    const prevStatus = order.status;

    order.status = status as any;
    order.statusTimeline.push({
      status: status as any,
      changedAt: new Date(),
      note,
      changedBy: adminID as any,
    });

    // pending → confirmed: actual stock কাটো
    if (status === "confirmed" && prevStatus === "pending") {
      await deductStockForItems(order.items as unknown as IOrderItem[], session);
    }

    // cancelled: stock ফেরত
    if (status === "cancelled") {
      order.cancelledBy = "admin";
      order.cancelReason = note;
      await restoreStockForItems(order.items as unknown as IOrderItem[], prevStatus, session);
    }

    await order.save({ session });
    await session.commitTransaction();
    return order;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ===================== USER CANCEL =====================
const cancelOrderByUser = async (
  orderID: string,
  userID: string,
  reason: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: orderID, userID }).session(session);
    if (!order) throw new Error("Order not found!");

    const cancellableStatuses = ["pending", "confirmed"];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order in '${order.status}' status`);
    }

    const prevStatus = order.status;

    order.status = "cancelled";
    order.cancelReason = reason;
    order.cancelledBy = "user";
    order.statusTimeline.push({
      status: "cancelled",
      changedAt: new Date(),
      note: reason,
    });

    await restoreStockForItems(order.items as unknown as IOrderItem[], prevStatus, session);

    await order.save({ session });
    await session.commitTransaction();
    return order;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ===================== AUTO EXPIRE =====================
const autoExpireOrders = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expiredOrders = await Order.find({
      status: "pending",
      pendingExpiresAt: { $lte: new Date() },
    }).session(session);

    for (const order of expiredOrders) {
      order.status = "cancelled";
      order.cancelReason = "Auto cancelled - payment timeout";
      order.cancelledBy = "admin";
      order.statusTimeline.push({
        status: "cancelled",
        changedAt: new Date(),
        note: "Auto cancelled after 30 minutes",
      });

      await restoreStockForItems(
        order.items as unknown as IOrderItem[],
        "pending",
        session,
      );

      await order.save({ session });
    }

    await session.commitTransaction();
    return expiredOrders.length;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ===================== QUERIES =====================
const getMyOrdersFromDB = async (userID: string, query: any) => {
  const { page = 1, limit = 10, status } = query;
  const filter: any = { userID, ...(status && { status }) };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-statusTimeline"),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page: Number(page), limit: Number(limit) };
};

const getSingleOrderFromDB = async (orderID: string, userID: string) => {
  const order = await Order.findOne({ _id: orderID, userID }).populate(
    "items.productID", "name thumbnail slug",
  );
  if (!order) throw new Error("Order not found!");
  return order;
};

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

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("userID", "name phone email"),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page: Number(page), limit: Number(limit) };
};


export const OrderServices = {
  createOrderIntoDB,
  getMyOrdersFromDB,
  getSingleOrderFromDB,
  cancelOrderByUser,
  getAllOrdersFromDB,
  updateOrderStatusByAdmin,
  autoExpireOrders,
};