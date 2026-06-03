import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../modules/auth/user.model";
import catchAsync from "../utils/catchAsync";

// --- Authenticated User Middleware ---
export const isAuthenticated = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Login first to access this resource",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found with this token",
      });
    }

    req.user = user;
    next();
  },
);

// --- Admin Role Middleware ---
export const isAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: `Role (${req.user.role}) is not allowed to access this resource`,
    });
  }

  next();
};
