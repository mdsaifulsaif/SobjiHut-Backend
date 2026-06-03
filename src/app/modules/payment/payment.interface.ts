export interface IPaymentPayload {
    amount: number;
    name: string;
    email: string;
    phone: string;
    address?: string;
    transactionId?: string;
}

export interface ISSLResponse {
    status: string;
    failedreason: string;
    sessionkey: string;
    GatewayPageURL: string;
}