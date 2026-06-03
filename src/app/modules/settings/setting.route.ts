import express from "express";
import { SettingControllers } from "./setting.controller";
import { isAdmin, isAuthenticated } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/multer.middleware";


const router = express.Router();

router.get("/", SettingControllers.getSettings);

router.patch(
  "/update",
  // isAuthenticated,
  // isAdmin,
 upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  SettingControllers.updateSettings
    
);







export const SettingRoutes = router;