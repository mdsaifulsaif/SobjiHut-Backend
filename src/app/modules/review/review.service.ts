import { IReview } from "./review.interface";
import { Review } from "./review.model";

const addReviewToDB = async (payload: IReview) => {
 
  const alreadyReviewed = await Review.findOne({
    productID: payload.productID,
    userID: payload.userID,
  });

  if (alreadyReviewed) {

    throw new Error("You have already submitted a review for this product!");
  }

  
  const result = await Review.create(payload);

  return result;
};

const getAllReviewsFromDB = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const result = await Review.find()
    .populate("userID", "name email avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments();
  const totalPage = Math.ceil(total / limit);

  return {
    meta: { page, limit, total, totalPage },
    data: result,
  };
};

const getReviewsByProductIdFromDB = async (productId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;

 
  const data = await Review.find({ productID: productId })
    .populate('userID', 'firstName lastName avatar') 
    .sort({ createdAt: -1 }) 
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments({ productID: productId });
  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data,
  };
};

export const ReviewServices = {
  addReviewToDB,
  getAllReviewsFromDB,
  getReviewsByProductIdFromDB
};
