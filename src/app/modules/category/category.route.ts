import { Router } from "express";
import { CategoryControllers } from "./category.controller";
import { isAdmin, isAuthenticated } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/multer.middleware";

const router = Router();

router.post(
  "/create-category",
  // isAuthenticated,
  // isAdmin,
  upload.single("image"),
  CategoryControllers.createCategory,
);

router.get("/", CategoryControllers.getCategories);

router.delete(
  "/:id",
  isAuthenticated,
  isAdmin,
  CategoryControllers.deleteCategory,
);

router.get(
  "/:id/products", CategoryControllers.getCategoryByProducts);

export const CategoryRoutes = router;
