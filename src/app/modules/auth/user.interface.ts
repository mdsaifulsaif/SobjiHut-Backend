import { Document, Model } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
  phoneNumber?: string;
  status: "active" | "blocked";
  avatar?: {
    public_id: string;
    url: string;
  };

  shippingAddress?: {
    addressLine?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserModel extends Model<IUser> {
  isPasswordMatched(password: string, hashedPassword: string): Promise<boolean>;
}
