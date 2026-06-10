import { Router } from "express";
import {
 
  ProductControllers,
} from "./product.controller";
import { isAuthenticated, isAdmin } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/multer.middleware";

const router = Router();

router.post(
  "/create-product",
  // isAuthenticated,
  // isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  ProductControllers.createProduct,
);

router.patch(
  "/:id",
  // isAuthenticated,
  // isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  ProductControllers.updateProduct,
);

router.get("/", ProductControllers.getAllProducts);



router.delete(
  "/:id",
  isAuthenticated,
  isAdmin,
  ProductControllers.deleteProduct,
);

// router.get("/bestselling", ProductControllers.getBestsellingProducts);

router.get("/related-products", ProductControllers.getRelatedProducts);
router.get("/low-stock", ProductControllers.getLowStockProducts);

router.get("/:id", ProductControllers.getSingleProduct);

export const ProductRoutes = router;
