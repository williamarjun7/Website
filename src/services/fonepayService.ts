import { insforge, handleInsforgeError } from './insforge';

export interface GenerateQrResult {
  success: boolean;
  prn: string;
  qrMessage: string;
  thirdpartyQrWebSocketUrl: string;
  amount: number;
}

export interface GenerateWebResult {
  success: boolean;
  prn: string;
  paymentUrl: string;
  amount: number;
}

export interface VerifyResult {
  success: boolean;
  status?: string;
  response_code?: string;
  message?: string;
  amount?: number;
  txnAmount?: number;
  uniqueId?: string;
}

export const generateQrPayment = async (
  orderId: string,
  remarks1 = 'Payment',
  remarks2 = ''
) => {
  try {
    const { data, error } = await insforge.functions.invoke('fonepay-payment', {
      body: {
        action: 'generate-qr',
        orderId,
        remarks1,
        remarks2,
      }
    });
    if (error) throw error;
    return { data: data as GenerateQrResult, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export const generateWebPayment = async (
  orderId: string,
  remarks1 = 'Payment',
  remarks2 = ''
) => {
  try {
    const { data, error } = await insforge.functions.invoke('fonepay-payment', {
      body: {
        action: 'generate-web',
        orderId,
        remarks1,
        remarks2,
      }
    });
    if (error) throw error;
    return { data: data as GenerateWebResult, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export const verifyQrPayment = async (prn: string) => {
  try {
    const { data, error } = await insforge.functions.invoke('fonepay-payment', {
      body: {
        action: 'verify-qr',
        prn,
      }
    });
    if (error) throw error;
    return { data: data as VerifyResult, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export const verifyWebPayment = async (
  prn: string,
  uid: string,
  amount: string,
  pid?: string,
  bankCode?: string
) => {
  try {
    const { data, error } = await insforge.functions.invoke('fonepay-payment', {
      body: {
        action: 'verify-web',
        prn,
        uid,
        amount,
        pid,
        bankCode,
      }
    });
    if (error) throw error;
    return { data: data as VerifyResult, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export interface PostTaxRefundData {
  prn: string;
  fonepayTraceId: string | number;
  invoiceNumber: string;
  invoiceDate: string;
  transactionAmount: string | number;
}

export const postTaxRefund = async (refundData: PostTaxRefundData) => {
  try {
    const { data, error } = await insforge.functions.invoke('fonepay-payment', {
      body: {
        action: 'post-tax-refund',
        ...refundData,
      }
    });
    if (error) throw error;
    return { data: data as { success: boolean; fonepayResponse: Record<string, unknown> }, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};
