import { Router } from "express";
import { UserRoutes } from "../modules/auth/user.route";
import { SubscriberRoutes } from "../modules/subscriber/subscriber.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { ProductRoutes } from "../modules/product/product.route";
// import { OrderRoutes } from "../modules/order/order.route";
import { SettingRoutes } from "../modules/settings/setting.route";
import { CustomerRoutes } from "../modules/customer/customer.route";

import path from "node:path";
import { PaymentRoutes } from "../modules/payment/payment.routes";
import { ContactRoutes } from "../modules/email/email.route";
import { UnitRoutes } from "../modules/unit/unit.route";
import { BrandRoutes } from "../modules/brand/brand.route";
import { OrderRoutes } from "../modules/order/order.route";

const router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: UserRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/products",
    route: ProductRoutes,
  },
  {
    path: "/order",
    route: OrderRoutes,
  },
  {
    path: "/subscribers",
    route: SubscriberRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/settings",
    route: SettingRoutes,
  },
  {
    path: "/customers",
    route: CustomerRoutes,
  },

  {
    path: "/payment",
    route: PaymentRoutes,
  },
  {
    path: "/contact",
    route: ContactRoutes,
  },
  {
    path: "/unit",
    route: UnitRoutes,
  },
  {
    path: "/brands",
    route: BrandRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
