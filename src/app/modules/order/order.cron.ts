// import cron from "node-cron";
// import { Order } from "./order.model";
// import { Product } from "../product/product.model";

// // প্রতি ৫ মিনিটে expired pending orders auto cancel
// export const startOrderExpiryJob = () => {
//   cron.schedule("*/5 * * * *", async () => {
//     console.log("🔄 Checking expired pending orders...");

//     const expiredOrders = await Order.find({
//       status: "pending",
//       pendingExpiresAt: { $lte: new Date() },
//     });

//     for (const order of expiredOrders) {
//       order.status = "cancelled";
//       order.cancelReason = "Auto cancelled - payment timeout";
//       order.cancelledBy = "admin";
//       order.statusTimeline.push({
//         status: "cancelled",
//         changedAt: new Date(),
//         note: "Auto cancelled after 30 minutes",
//       });

//       // reserve ফেরত দাও
//       for (const item of order.items) {
//         await Product.findByIdAndUpdate(item.productID, {
//           $inc: { reservedStock: -item.quantity },
//         });
//       }

//       await order.save();
//       console.log(`✅ Auto cancelled: ${order.orderNumber}`);
//     }
//   });
// };


import cron from "node-cron";
import { OrderServices } from "./order.service";

export const startOrderExpiryJob = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const count = await OrderServices.autoExpireOrders();
      if (count > 0) console.log(`✅ Auto cancelled ${count} expired orders`);
    } catch (error) {
      console.error("❌ Order expiry job error:", error);
    }
  });
};