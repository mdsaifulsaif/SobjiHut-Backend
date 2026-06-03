
import { ISubscriber } from './subscriber.interface';
import { Subscriber } from './subscriber.model';

const addSubscriberToDB = async (payload: ISubscriber) => {
  const isSubscriberExist = await Subscriber.findOne({ email: payload.email });

  if (isSubscriberExist) {
    throw new Error('You have already subscribed with this email!');
  }
  const result = await Subscriber.create(payload);
  return result;
};

const getAllSubscribersFromDB = async (page: number, limit: number) => {
 
  const skip = (page - 1) * limit;


  const result = await Subscriber.find()
    .sort({ createdAt: -1 }) 
    .skip(skip)
    .limit(limit);

 
  const total = await Subscriber.countDocuments();

  
  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data: result,
  };
};



export const SubscriberServices = {
  addSubscriberToDB,
  getAllSubscribersFromDB,
};