import { Types } from "mongoose";

export type DeliveryType = "local" | "nationwide";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "card" | "bank";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_paid";

export interface IOrderItem {
  productID: Types.ObjectId;
  variantID?: Types.ObjectId | null;  // ✅
  productType?: string;               // ✅
  productName: string;
  thumbnail: string;
  weightOrVolume?: number;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  salePrice?: number;
  totalPrice: number;
}

export interface IDeliveryAddress {
  name: string;
  phone: string;
  city: string;
  area?: string;
  district?: string;
  upazila?: string;
  houseNo?: string;
  road?: string;
  block?: string;
  floor?: string;
  flatNo?: string;
  postalCode?: string;
  deliveryNotes?: string;
  label?: "home" | "work" | "partner" | "other";
}

export interface IStatusTimeline {
  status: OrderStatus;
  changedAt: Date;
  note?: string;
  changedBy?: Types.ObjectId;
}

export interface IOrder {
  orderNumber: string;
  userID: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  couponDiscount: number;
  shippingCharge: number;
  totalAmount: number;
  pendingExpiresAt?: Date;
  deliveryType: DeliveryType;
  deliveryAddress: IDeliveryAddress;
  preferredDeliveryTime?: string;
  estimatedDelivery?: Date;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionID?: string;
  status: OrderStatus;
  statusTimeline: IStatusTimeline[];
  specialInstructions?: string;
  isGift?: boolean;
  giftNote?: string;
  cancelReason?: string;
  cancelledBy?: "user" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}
