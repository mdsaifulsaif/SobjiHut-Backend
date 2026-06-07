import { Types } from "mongoose";

// ডেলিভারি টাইপ - local (Barisal area) vs nationwide
export type DeliveryType = "local" | "nationwide";

// অর্ডার স্ট্যাটাস - Chaldal-এর মতো flow
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

// পেমেন্ট মেথড
export type PaymentMethod = "cod" | "bkash" | "nagad" | "card" | "bank";

// পেমেন্ট স্ট্যাটাস
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_paid";

// অর্ডারের প্রতিটি প্রোডাক্ট আইটেম
export interface IOrderItem {
  productID: Types.ObjectId;
  variantIndex?: number; // variant থাকলে কোন index
  productName: string; // snapshot - পরে প্রোডাক্ট চেঞ্জ হলেও অর্ডার ঠিক থাকবে
  thumbnail: string; // snapshot
  sku?: string; // snapshot
  quantity: number;
  unit: string; // snapshot - "kg", "pcs" etc
  unitPrice: number; // সেই সময়ের দাম (snapshot)
  salePrice?: number; // ডিসকাউন্ট থাকলে
  totalPrice: number; // quantity * effectivePrice
}

// ডেলিভারি ঠিকানা
export interface IDeliveryAddress {
  name: string;
  phone: string;
  city: string;
  area?: string; // local delivery-র জন্য
  district?: string; // nationwide-র জন্য
  upazila?: string; // nationwide-র জন্য
  houseNo?: string;
  road?: string;
  block?: string;
  floor?: string;
  flatNo?: string;
  postalCode?: string;
  deliveryNotes?: string;
  label?: "home" | "work" | "partner" | "other";
}

// টাইমলাইন - অর্ডারের প্রতিটি স্ট্যাটাস চেঞ্জের history
export interface IStatusTimeline {
  status: OrderStatus;
  changedAt: Date;
  note?: string; // admin note
  changedBy?: Types.ObjectId; // কোন admin চেঞ্জ করেছে
}

export interface IOrder {
  orderNumber: string; // human-readable: ORD-2024-00001
  userID: Types.ObjectId;

  items: IOrderItem[];

  // প্রাইস ব্রেকডাউন
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  couponDiscount: number;
  shippingCharge: number;
  totalAmount: number;

  pendingExpiresAt?: Date;

  // ডেলিভারি
  deliveryType: DeliveryType; // local বা nationwide
  deliveryAddress: IDeliveryAddress;
  preferredDeliveryTime?: string; // "morning", "afternoon", "evening"
  estimatedDelivery?: Date;

  // পেমেন্ট
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionID?: string; // bkash/nagad transaction ref

  // স্ট্যাটাস
  status: OrderStatus;
  statusTimeline: IStatusTimeline[];

  // Extra
  specialInstructions?: string;
  isGift?: boolean;
  giftNote?: string;

  cancelReason?: string;
  cancelledBy?: "user" | "admin";

  createdAt?: Date;
  updatedAt?: Date;
}
