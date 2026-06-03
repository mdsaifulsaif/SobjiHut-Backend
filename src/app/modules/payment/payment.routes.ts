import express from 'express';
import { PaymentController } from './payment.controller';

const router = express.Router();

// পেমেন্ট ইনিশিয়েট করার এন্ডপয়েন্ট
router.post('/init', PaymentController.initiatePayment);

// SSLCommerz পেমেন্ট শেষে এই POST রাউটগুলোতে হিট করবে
router.post('/success/:tranId', PaymentController.handleSuccess);
router.post('/fail/:tranId', PaymentController.handleFail);

// ক্যানসেল হ্যান্ডলার
router.post('/cancel', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
});

export const PaymentRoutes = router;