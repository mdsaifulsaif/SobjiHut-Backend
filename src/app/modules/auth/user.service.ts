import { IUser } from "./user.interface";
import { User } from "./user.model";


const registerUserIntoDB = async (payload: IUser) => {
  const result = await User.create(payload);
  return result;
};


const findUserByEmail = async (email: string, includePassword = false) => {
  const query = User.findOne({ email });
  if (includePassword) query.select("+password");
  return await query;
};


const updateProfileInDB = async (id: string, payload: Partial<IUser>) => {
  const result = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};


const findUserById = async (id: string) => {
  return await User.findById(id);
};
const getMeFromDB = async (id: string) => {
  return await User.findById(id).select("-password");
};

const findUserWithPassword = async (id: string) => {
  return await User.findById(id).select("+password");
};

export const UserServices = {
  registerUserIntoDB,
  findUserByEmail,
  updateProfileInDB,
  findUserById,
  getMeFromDB,
  findUserWithPassword
};