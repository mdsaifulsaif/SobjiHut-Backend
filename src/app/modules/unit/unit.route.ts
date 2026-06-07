import express from "express";
import { UnitControllers } from "./unit.controller";

const router = express.Router();

// ইউনিট ক্রিয়েট করার রাউট
router.post("/create-unit", UnitControllers.createUnit);

// পেজিনেশন ও সার্চ সহ গেট রাউট (যেমন: /api/units?page=1&limit=5&searchTerm=kg)
router.get("/", UnitControllers.getAllUnits);

router.get("/:id", UnitControllers.getSingleUnit);

// ইউনিট আপডেট করার রাউট (আইডি দিয়ে)
router.patch("/:id", UnitControllers.updateUnit);

export const UnitRoutes = router;
