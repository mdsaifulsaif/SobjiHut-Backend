import { Types } from 'mongoose';

export interface IShippingAddress {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ICartItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  thumbnail: string;
}

export interface IOrder {
  user: Types.ObjectId;
  firstName: string;
  lastName: string;
  createdAt: Date; 
  updatedAt: Date;
  email: string;
  phone: string;
  shippingAddress: IShippingAddress;
  cartItems: ICartItem[];
  totalAmount: number;
  shippingCost: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid';
}




export interface IDashboardData {
  stats: {
    title: string;
    value: string;
    icon: string;
  }[];
  
  charts: {
    salesOverview: { name: string; value: number }[];
  };
  recentOrders: any[];
  topProducts: any[];
}