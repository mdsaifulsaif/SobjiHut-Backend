import express from "express";
import { BrandControllers } from "./brand.controller";
import { isAdmin, isAuthenticated } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/multer.middleware";


const router = express.Router();


router.post(
  "/create-brand", 
//   isAuthenticated, 
//   isAdmin, 
  upload.single("logo"), 
  BrandControllers.createBrand
);


router.get("/", BrandControllers.getAllBrands);


router.patch(
  "/:id", 
  // isAuthenticated, 
  // isAdmin, 
  upload.single("logo"), 
  BrandControllers.updateBrand
);

router.get('/:id', BrandControllers.getSingleBrand)

router.delete(
  "/:id", 
  isAuthenticated, 
  isAdmin, 
  BrandControllers.deleteBrand
);

export const BrandRoutes = router;