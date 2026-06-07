// order.config.ts

export const SHIPPING_CONFIG = {
  local: {
    // Barisal city এর মধ্যে
    areas: ["বরিশাল সদর", "বানারীপাড়া", "বাবুগঞ্জ"], // তোমার areas
    freeShippingMinOrder: 500,
    shippingCharge: 30,
    estimatedDays: 0, // same day
  },
  nationwide: {
    // সারাদেশে (sundarban courier / pathao)
    freeShippingMinOrder: 2000,
    shippingCharge: 120,
    estimatedDays: 3,
  },
};

export const calculateShipping = (
  deliveryType: "local" | "nationwide",
  subtotal: number,
): number => {
  const config = SHIPPING_CONFIG[deliveryType];
  if (subtotal >= config.freeShippingMinOrder) return 0;
  return config.shippingCharge;
};
