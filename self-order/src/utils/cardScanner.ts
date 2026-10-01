import { NativeModules } from 'react-native';

const { CardScannerModule } = NativeModules;

export interface McsCardScannerConfig {
  packageName: string;
  activityName: string;
  requestCode: number;
}

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

export const MCS_CARD_SCANNER_CONFIG: McsCardScannerConfig = {
  packageName: 'com.gerege.mpos',
  activityName: 'com.gerege.mpos.activities.MainActivity',
  requestCode: 166666,
};

export const launchCardScanner = async (
  paymentAmount: string,
  returnPackage: string = 'com.mn.qmenu.selforder',
  returnActivity: string = 'com.mn.qmenu.selforder.MainActivity',
): Promise<McsPaymentResponse> => {
  if (!CardScannerModule) {
    throw new Error('Card scanner module is not available. Please check your app configuration.');
  }

  try {
    const result = await CardScannerModule.launchScanner(paymentAmount, returnPackage, returnActivity);

    let responseBody: any = null;
    if (result.response_body) {
      if (typeof result.response_body === 'string') {
        try {
          responseBody = JSON.parse(result.response_body);
        } catch (e) {
          responseBody = result.response_body;
        }
      } else {
        responseBody = result.response_body;
      }
    } else if (result.response_body_map) {
      responseBody = result.response_body_map;
    }

    return { payment_status: result.payment_status || false, response_body: responseBody };
  } catch (error: any) {
    if (error.code === 'CANCELLED') throw new Error('CANCELLED');
    if (error.message?.includes('No Activity found') || error.code === 'LAUNCH_ERROR') {
      throw new Error('Card scanner app is not installed. Please install the Gerege MPOS app.');
    }
    throw error;
  }
};
