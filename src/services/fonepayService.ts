import { insforge, handleInsforgeError } from './insforge';

export interface GenerateQrResult {
  success: boolean;
  prn: string;
  qrCode: string | Record<string, unknown>;
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
  amount: number,
  remarks1 = 'Payment',
  remarks2 = ''
) => {
  try {
    const { data, error } = await insforge.functions.invoke('fonepay-payment', {
      body: {
        action: 'generate-qr',
        orderId,
        amount,
        remarks1,
        remarks2,
      }
    });
    if (error) throw error;
    return { data: data as GenerateQrResult, error: null };
  } catch (error) {
    console.error('QR payment generation failed:', error);
    return handleInsforgeError(error);
  }
};

export const generateWebPayment = async (
  orderId: string,
  amount: number,
  remarks1 = 'Payment',
  remarks2 = ''
) => {
  try {
    const { data, error } = await insforge.functions.invoke('fonepay-payment', {
      body: {
        action: 'generate-web',
        orderId,
        amount,
        remarks1,
        remarks2,
      }
    });
    if (error) throw error;
    return { data: data as GenerateWebResult, error: null };
  } catch (error) {
    console.error('Web payment generation failed:', error);
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
    console.error('QR payment verification failed:', error);
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
    console.error('Web payment verification failed:', error);
    return handleInsforgeError(error);
  }
};
