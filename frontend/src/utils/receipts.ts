// frontend/src/utils/receipts.ts
import * as WebBrowser from 'expo-web-browser';

export const openReceiptInBrowser = async (url: string): Promise<void> => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: '#3BB143',
      controlsColor: '#FFFFFF',
      showTitle: true,
    });
  } catch (error) {
    throw new Error('Unable to open receipt. Please try again.');
  }
};

export const buildReceiptUrl = (baseUrl: string, receiptId: number): string => {
  return `${baseUrl}/api/receipts/${receiptId}/download/`;
};

export const buildTransactionExportUrl = (baseUrl: string): string => {
  return `${baseUrl}/api/transactions/export/pdf/`;
};

export const buildClientPrintUrl = (baseUrl: string, clientId: number): string => {
  return `${baseUrl}/api/clients/${clientId}/print/`;
};
