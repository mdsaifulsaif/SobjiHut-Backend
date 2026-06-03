import { Types } from 'mongoose';

export interface IReview {
  productID: Types.ObjectId;
  userID: Types.ObjectId;
  rating: number;
  comment: string;
}