

import { Response } from "express";
import jwt from "jsonwebtoken";


interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user";
  avatar?: {
    public_id?: string;
    url: string;
  };
  [key: string]: any; 
}

export const sendToken = (
  user: IUser,
  statusCode: number,
  res: Response,
): void => {

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" },
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
  };


  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

 
  const finalUserResponse = {
    _id: userObj._id,
    firstName: userObj.firstName,
    lastName: userObj.lastName,
    email: userObj.email,
    role: userObj.role,
    avatar: {
      url: userObj.avatar?.url || "https://example.com/default-avatar.png",
    },

    ...userObj 
  };

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      message:
        statusCode === 201
          ? "Registered Successfully"
          : "Logged in Successfully",
      data: {
        user: finalUserResponse,
        token,
      },
    });
};