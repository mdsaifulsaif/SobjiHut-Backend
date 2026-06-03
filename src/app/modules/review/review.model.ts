import { Schema, model } from 'mongoose';
import { IReview } from './review.interface';

const reviewSchema = new Schema<IReview>(
  {
    productID: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    userID: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    rating: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    comment: { 
      type: String, 
      required: true 
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

export const Review = model<IReview>('Review', reviewSchema);