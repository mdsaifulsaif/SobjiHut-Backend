import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./user.service";
import { sendToken } from "../../utils/jwtToken";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";
import { IUser } from "./user.interface";
import { User } from "./user.model";

//   const { email, password, ...rest } = req.body;

//   const userExists = await UserServices.findUserByEmail(email);
//   if (userExists) {
//     throw new Error("User already exists with this email!");
//   }

//   const salt = await bcrypt.genSalt(10);
//   const hashedPassword = await bcrypt.hash(password, salt);

//   const userData = {
//     ...rest,
//     email,
//     password: hashedPassword,
//   };

//   const result = await UserServices.registerUserIntoDB(userData);

//   sendResponse(res, {
//     statusCode: 201,
//     success: true,
//     message: "User registered successfully",
//     data: result,
//   });
//   sendToken(result as any, 201, res);
// });
const registerUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password, ...rest } = req.body;

  const userExists = await UserServices.findUserByEmail(email);
  if (userExists) {
    throw new Error("User already exists with this email!");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const userData = {
    ...rest,
    email,
    password: hashedPassword,
  };

  const result = await UserServices.registerUserIntoDB(userData);

  sendToken(result as any, 201, res);
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new Error("Please enter both email and password");
  }

  const user = await UserServices.findUserByEmail(email, true);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.status === "blocked") {
    return res.status(403).json({
      success: false,
      message:
        "Access Denied! Your account is currently blocked. Please contact support.",
    });
  }

  const isPasswordMatched = await (User as any).isPasswordMatched(
    password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new Error("Invalid email or password");
  }

  sendToken(user as any, 200, res);
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  res.cookie("token", null, {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged Out Successfully",
    data: null,
  });
});

// --- Update Profile ---

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  const user = await User.findById(userId).select("+password");

  if (!user) throw new Error("User not found!");

  const {
    firstName,
    lastName,
    phoneNumber,
    addressLine,
    city,
    state,
    postalCode,
    currentPassword,
    newPassword,
  } = req.body;

  let updateData: any = {};

  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phoneNumber) updateData.phoneNumber = phoneNumber;

  if (req.file) {
    if ((user as any).avatar?.public_id) {
      await deleteFromCloudinary((user as any).avatar.public_id);
    }

    const uploadResult: any = await uploadToCloudinary(
      req.file.buffer,
      "avatars",
    );
    updateData.avatar = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url || uploadResult.url,
    };
  }

  if (addressLine || city || state || postalCode) {
    const existing = (user as any).shippingAddress || {};
    updateData.shippingAddress = {
      addressLine: addressLine || existing.addressLine || "",
      city: city || existing.city || "",
      state: state || existing.state || "",
      postalCode: postalCode || existing.postalCode || "",
      country: "Bangladesh",
    };
  }

  if (currentPassword && newPassword) {
    const isPasswordMatch = await (User as any).isPasswordMatched(
      currentPassword,
      user.password,
    );

    if (!isPasswordMatch) throw new Error("Current password is incorrect!");

    user.password = newPassword;
    await user.save();
  }

  const result = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully!",
    data: result,
  });
});

// interface AuthRequest extends Request {
//   user?: IUser;
// }

// const getMe = catchAsync(async (req: AuthRequest, res: Response) => {
const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new Error("You are not authorized!");
  }

  const result = await UserServices.getMeFromDB(userId.toString());

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully!",
    data: result,
  });
});

export const UserControllers = {
  registerUser,
  loginUser,
  logoutUser,
  updateProfile,
  getMe,
};
