import { Request, Response } from 'express';
import { PaymentService } from './payment.service';

const initiatePayment = async (req: Request, res: Response) => {
    try {
        const transactionId = `TXN-${Date.now()}`;
        const paymentUrl = await PaymentService.initPayment({
            ...req.body,
            transactionId,
        });

        res.status(200).json({
            success: true,
            message: "Payment session created",
            data: paymentUrl
        });
    } catch (error) {
        console.error("SSLCommerz Error:", error);
        res.status(500).json({
            success: false,
            message: "SSLCommerz Initiation Failed",
            error: (error as Error).message
        });
    }
};

const handleSuccess = async (req: Request, res: Response) => {
    const { tranId } = req.params;
    
    // SSLCommerz থেকে আসা ডাটা req.body তে থাকে
    const paymentData = req.body;

    console.log(`Transaction ID: ${tranId} is successful`, paymentData);

    // এখানে আপনার DB আপডেট লজিক লিখুন (যেমন: Order status = 'Paid')

    // ফ্রন্টেন্ডে রিডাইরেক্ট
    res.redirect(`${process.env.FRONTEND_URL}/payment/success?transactionId=${tranId}`);
};

const handleFail = async (req: Request, res: Response) => {
    res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
};

export const PaymentController = {
    initiatePayment,
    handleSuccess,
    handleFail
};