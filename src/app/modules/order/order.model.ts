// import mongoose, { Schema, model } from "mongoose";
// import { IOrder, IOrderItem } from "./order.interface";

// const orderItemSchema = new Schema<IOrderItem>(
//   {
//     productID: { type: Schema.Types.ObjectId, ref: "Product", required: true },
//     variantIndex: { type: Number },
//     productName: { type: String, required: true },
//     thumbnail: { type: String, required: true },
//     sku: { type: String },
//     quantity: { type: Number, required: true, min: 1 },
//     unit: { type: String, required: true },
//     unitPrice: { type: Number, required: true, min: 0 },
//     salePrice: { type: Number, min: 0 },
//     totalPrice: { type: Number, required: true, min: 0 },
//   },
//   { _id: false },
// );

// const deliveryAddressSchema = new Schema(
//   {
//     name: { type: String, required: true },
//     phone: { type: String, required: true },
//     city: { type: String, required: true },
//     area: { type: String },
//     district: { type: String },
//     upazila: { type: String },
//     houseNo: { type: String },
//     road: { type: String },
//     block: { type: String },
//     floor: { type: String },
//     flatNo: { type: String },
//     postalCode: { type: String },
//     deliveryNotes: { type: String },
//     label: {
//       type: String,
//       enum: ["home", "work", "partner", "other"],
//       default: "home",
//     },
//   },
//   { _id: false },
// );

// const statusTimelineSchema = new Schema(
//   {
//     status: { type: String, required: true },
//     changedAt: { type: Date, default: Date.now },
//     note: { type: String },
//     changedBy: { type: Schema.Types.ObjectId, ref: "User" },
//   },
//   { _id: false },
// );

// const orderSchema = new Schema<IOrder>(
//   {
//     orderNumber: { type: String, unique: true },

//     userID: { type: Schema.Types.ObjectId, ref: "User", required: true },

//     items: { type: [orderItemSchema], required: true },

//     subtotal: { type: Number, required: true, min: 0 },
//     discountAmount: { type: Number, default: 0, min: 0 },
//     couponCode: { type: String, trim: true },
//     couponDiscount: { type: Number, default: 0, min: 0 },
//     shippingCharge: { type: Number, default: 0, min: 0 },
//     totalAmount: { type: Number, required: true, min: 0 },

//     deliveryType: {
//       type: String,
//       enum: ["local", "nationwide"],
//       required: true,
//     },
//     deliveryAddress: { type: deliveryAddressSchema, required: true },
//     preferredDeliveryTime: {
//       type: String,
//       enum: ["morning", "afternoon", "evening"],
//     },
//     estimatedDelivery: { type: Date },

//     paymentMethod: {
//       type: String,
//       enum: ["cod", "bkash", "nagad", "card", "bank"],
//       required: true,
//     },
//     paymentStatus: {
//       type: String,
//       enum: ["unpaid", "paid", "refunded", "partially_paid"],
//       default: "unpaid",
//     },
//     transactionID: { type: String, trim: true },

//     status: {
//       type: String,
//       enum: [
//         "pending",
//         "confirmed",
//         "processing",
//         "shipped",
//         "out_for_delivery",
//         "delivered",
//         "cancelled",
//         "returned",
//       ],
//       default: "pending",
//     },
//     statusTimeline: { type: [statusTimelineSchema], default: [] },

//     specialInstructions: { type: String },
//     isGift: { type: Boolean, default: false },
//     giftNote: { type: String },

//     cancelReason: { type: String },
//     cancelledBy: { type: String, enum: ["user", "admin"] },
//     pendingExpiresAt: { type: Date },
//   },
//   { timestamps: true },
// );

// // Auto orderNumber generate: ORD-2024-000001
// orderSchema.pre("save", async function () {
//   if (!this.orderNumber) {
//     const year = new Date().getFullYear();
//     const count = await Order.countDocuments();
//     this.orderNumber = `ORD-${year}-${String(count + 1).padStart(6, "0")}`;
//   }

//   // প্রথম status timeline entry
//   if (this.statusTimeline.length === 0) {
//     this.statusTimeline.push({
//       status: this.status,
//       changedAt: new Date(),
//       note: "Order placed",
//     });
//   }
// });

// export const Order = model<IOrder>("Order", orderSchema);
