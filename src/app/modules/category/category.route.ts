import { Router } from "express";
import { CategoryControllers } from "./category.controller";
import { isAdmin, isAuthenticated } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/multer.middleware";
const router = Router();

// ১. সবার আগে নির্দিষ্ট রাউটগুলো (যেখানে স্ট্যাটিক পাথ আছে)
router.post(
  "/create-category",
  upload.single("image"),
  CategoryControllers.createCategory,
);

router.patch(
  "/update-category/:id",
  upload.single("image"),
  CategoryControllers.updateCategory,
);

// category.route.ts এ এটি যোগ করুন
router.get("/:id", CategoryControllers.getSingleCategory);

// ২. এরপর প্যারামিটারযুক্ত রাউটগুলো (যেখানে ডাইনামিক আইডি আছে)
router.get("/:id/products", CategoryControllers.getCategoryByProducts);




router.delete(
  "/:id",
  // isAuthenticated,
  // isAdmin,
  CategoryControllers.deleteCategory,
);

// ৩. সবার শেষে সাধারণ বা রুট রাউট
router.get("/", CategoryControllers.getCategories);

export const CategoryRoutes = router;
