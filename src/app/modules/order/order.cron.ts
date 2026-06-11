import cron from "node-cron";
import { OrderServices } from "./order.service";

export const startOrderExpiryJob = () => {
  // Cron job started log.

  console.log(" Order Expiry Cron Job started (Running every 5 minutes)...");

  // "*/5 * * * *" means it runs every 5 minutes.

  cron.schedule("*/5 * * * *", async () => {
    console.log(
      " Checking for expired orders at:",
      new Date().toLocaleTimeString(),
    );

    try {
      const count = await OrderServices.autoExpireOrders();

      if (count > 0) {
        // Log when orders are cancelled.
     
        console.log(`✅ Auto cancelled ${count} expired orders`);
      } else {
        // Log when no expired orders are found.
   
        console.log("ℹ️ No expired orders found this time.");
      }
    } catch (error) {
      // Log if an error occurs.
     
      console.error(" Order expiry job error:", error);
    }
  });
};