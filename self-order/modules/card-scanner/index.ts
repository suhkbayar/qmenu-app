import { requireOptionalNativeModule } from 'expo';

type ScannerResult = {
  payment_status?: boolean;
  resultCode: number;
  response_body?: string;
  response_body_map?: Record<string, unknown>;
  error?: string;
};

type CardScannerNative = {
  launchScanner(amount: string, returnPackage: string, returnActivity: string): Promise<ScannerResult>;
};

export interface McsPaymentResponse {
  payment_status: boolean;
  response_body?: {
    message: string;
    tran_no: string;
    stan: string;
    approval: string;
    rrn: string;
    date: string;
  };
}

// Android only
const native = requireOptionalNativeModule<CardScannerNative>('CardScanner');

const RETURN_PACKAGE = 'com.mn.qmenu.selforder';
const RETURN_ACTIVITY = 'com.mn.qmenu.selforder.MainActivity';

/** Opens the Gerege mPOS app to take a card payment and resolves with its result. */
export async function launchCardScanner(paymentAmount: string): Promise<McsPaymentResponse> {
  if (!native) {
    throw new Error('Card scanner module is not available. Please check your app configuration.');
  }

  try {
    const result = await native.launchScanner(paymentAmount, RETURN_PACKAGE, RETURN_ACTIVITY);
    return { payment_status: result.payment_status ?? false, response_body: parseBody(result) };
  } catch (error: any) {
    if (error.code === 'LAUNCH_ERROR' || error.message?.includes('No Activity found')) {
      throw new Error('Card scanner app is not installed. Please install the Gerege MPOS app.');
    }
    throw error;
  }
}

// mPOS sends the body either as a JSON string or as a key-value map
function parseBody(result: ScannerResult): any {
  if (result.response_body) {
    try {
      return JSON.parse(result.response_body);
    } catch {
      return result.response_body;
    }
  }
  return result.response_body_map ?? null;
}
