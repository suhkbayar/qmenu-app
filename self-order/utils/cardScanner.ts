import { Platform, NativeModules } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

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

/**
 * Launch the MCS card scanner app for payment processing using native module
 * This properly receives startActivityForResult responses
 * @param paymentAmount - The amount to charge (as string)
 * @param returnPackage - Your app's package name (default: com.mn.qmenu.selforder)
 * @param returnActivity - Your app's activity to return to
 * @returns Promise with payment response
 */
export const launchCardScanner = async (
  paymentAmount: string,
  returnPackage: string = 'com.mn.qmenu.selforder',
  returnActivity: string = 'com.mn.qmenu.selforder.MainActivity',
): Promise<McsPaymentResponse> => {
  if (Platform.OS !== 'android') {
    throw new Error('MCS Card Scanner is only available on Android');
  }

  // Try native module first (supports startActivityForResult)
  if (CardScannerModule) {
    try {
      console.log('📱 [CARD_SCANNER] Using native module with params:', {
        paymentAmount,
        returnPackage,
        returnActivity,
      });

      const result = await CardScannerModule.launchScanner(
        paymentAmount,
        returnPackage,
        returnActivity,
      );

      console.log('📱 [CARD_SCANNER] Native module returned result');
      console.log('📱 [CARD_SCANNER] Raw result:', JSON.stringify(result, null, 2));

      const response: McsPaymentResponse = {
        payment_status: result.payment_status === true,
      };

      // Handle response_body
      if (result.response_body) {
        if (typeof result.response_body === 'string') {
          try {
            console.log('📱 [CARD_SCANNER] Parsing response_body string');
            response.response_body = JSON.parse(result.response_body);
          } catch (e) {
            console.warn('📱 [CARD_SCANNER] Failed to parse response_body:', e);
          }
        } else {
          response.response_body = result.response_body;
        }
      } else if (result.response_body_map) {
        // Handle HashMap converted to WritableMap
        response.response_body = result.response_body_map;
      }

      console.log('📱 [CARD_SCANNER] Final response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error: any) {
      console.error('🔴 [CARD_SCANNER] Native module error:', error);

      if (error.code === 'CANCELLED') {
        return { payment_status: false };
      }

      if (error.message?.includes('No Activity found') || error.code === 'LAUNCH_ERROR') {
        throw new Error('Card scanner app is not installed. Please install the Gerege MPOS app.');
      }

      throw new Error(error.message || 'Failed to launch card scanner');
    }
  }

  // Fallback to expo-intent-launcher (doesn't receive result extras properly)
  console.log('📱 [CARD_SCANNER] Fallback: Using expo-intent-launcher');
  return launchCardScannerFallback(paymentAmount, returnPackage, returnActivity);
};

/**
 * Fallback implementation using expo-intent-launcher
 * Note: This doesn't properly receive startActivityForResult extras
 */
const launchCardScannerFallback = async (
  paymentAmount: string,
  returnPackage: string,
  returnActivity: string,
): Promise<McsPaymentResponse> => {
  try {
    console.log('📱 [CARD_SCANNER_FALLBACK] Launching MPOS app with params:', {
      paymentAmount,
      returnPackage,
      returnActivity,
      packageName: MCS_CARD_SCANNER_CONFIG.packageName,
      activityName: MCS_CARD_SCANNER_CONFIG.activityName,
    });

    const result = await IntentLauncher.startActivityAsync(
      'android.intent.action.SEND' as IntentLauncher.ActivityAction,
      {
        className: MCS_CARD_SCANNER_CONFIG.activityName,
        packageName: MCS_CARD_SCANNER_CONFIG.packageName,
        extra: {
          return_package: returnPackage,
          return_activity: returnActivity,
          pay_amount: paymentAmount,
        },
      },
    );

    console.log('📱 [CARD_SCANNER_FALLBACK] MPOS app returned result');
    console.log('📱 [CARD_SCANNER_FALLBACK] Raw result:', JSON.stringify(result, null, 2));

    // Parse the result from the intent
    const extras = result.extra as Record<string, any> | undefined;
    console.log('📱 [CARD_SCANNER_FALLBACK] Extras:', JSON.stringify(extras, null, 2));

    const paymentStatus = extras?.payment_status === 'true' || extras?.payment_status === true;
    const responseBody = extras?.response_body;

    console.log('📱 [CARD_SCANNER_FALLBACK] Parsed payment_status:', paymentStatus);
    console.log('📱 [CARD_SCANNER_FALLBACK] Raw payment_status value:', extras?.payment_status);
    console.log('📱 [CARD_SCANNER_FALLBACK] Response body:', responseBody);

    const response: McsPaymentResponse = {
      payment_status: paymentStatus,
    };

    if (responseBody) {
      // If response_body is a string, parse it
      if (typeof responseBody === 'string') {
        try {
          console.log('📱 [CARD_SCANNER_FALLBACK] Parsing response_body string');
          response.response_body = JSON.parse(responseBody);
          console.log('📱 [CARD_SCANNER_FALLBACK] Parsed response_body:', response.response_body);
        } catch (e) {
          console.warn('📱 [CARD_SCANNER_FALLBACK] Failed to parse response_body:', e);
        }
      } else {
        console.log('📱 [CARD_SCANNER_FALLBACK] Response body is already an object');
        response.response_body = responseBody;
      }
    }

    console.log('📱 [CARD_SCANNER_FALLBACK] Final response:', JSON.stringify(response, null, 2));
    return response;
  } catch (error: any) {
    console.error('🔴 [CARD_SCANNER_FALLBACK] Error occurred:', error);
    console.error('🔴 [CARD_SCANNER_FALLBACK] Error message:', error.message);
    console.error('🔴 [CARD_SCANNER_FALLBACK] Error stack:', error.stack);

    if (error.message?.includes('No Activity found')) {
      throw new Error('Card scanner app is not installed. Please install the Gerege MPOS app.');
    }

    throw new Error(error.message || 'Failed to launch card scanner');
  }
};

/**
 * Check if the MCS card scanner app is installed
 * @returns Promise<boolean>
 */
export const isCardScannerInstalled = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    // Try to launch the app to check if it exists
    await IntentLauncher.startActivityAsync('android.intent.action.SEND' as IntentLauncher.ActivityAction, {
      packageName: MCS_CARD_SCANNER_CONFIG.packageName,
      className: MCS_CARD_SCANNER_CONFIG.activityName,
      extra: {},
    });
    return true;
  } catch (error) {
    return false;
  }
};
