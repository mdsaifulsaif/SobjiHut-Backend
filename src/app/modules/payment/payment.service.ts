// @ts-ignore
import SSLCommerzPayment from 'sslcommerz-lts';
import { IPaymentPayload } from './payment.interface';

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = process.env.IS_LIVE === 'true';

const initPayment = async (payload: IPaymentPayload) => {
    const { amount, name, email, phone, address, transactionId } = payload;

    const data = {
        total_amount: amount,
        currency: 'BDT',
        tran_id: transactionId,
        success_url: `${process.env.BACKEND_URL}/api/v1/payment/success/${transactionId}`,
        fail_url: `${process.env.BACKEND_URL}/api/v1/payment/fail/${transactionId}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/payment/cancel`,
        ipn_url: `${process.env.BACKEND_URL}/api/v1/payment/ipn`,
        shipping_method: 'NO', 
        product_name: 'Glowly Store Product',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: name || 'Customer Name',
        cus_email: email || 'test@test.com',
        cus_add1: address || 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: phone || '01700000000',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: '1000',
        ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    
    // SSLCommerz থেকে রেসপন্স নেওয়া
    const apiResponse = await sslcz.init(data);

    // টার্মিনালে চেক করার জন্য এই লগটি খুব গুরুত্বপূর্ণ
    console.log("SSLCommerz Full Response:", apiResponse);

    if (apiResponse?.status === 'SUCCESS' && apiResponse?.GatewayPageURL) {
        return apiResponse.GatewayPageURL;
    } else {
        // যদি ফেইল হয়, তবে টার্মিনালে আসল কারণ প্রিন্ট হবে
        const reason = apiResponse?.failedreason || "Unknown Error from SSLCommerz";
        throw new Error(reason);
    }
};

export const PaymentService = {
    initPayment,
};