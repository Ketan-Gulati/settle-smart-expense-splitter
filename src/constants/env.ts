export interface EnvConfig {
  appName: string;
  version: string;
  isDevelopment: boolean;
  defaultCurrency: string;
}

export const env: EnvConfig = {
  appName: 'Settle',
  version: '0.1.0',
  isDevelopment: __DEV__,
  defaultCurrency: 'INR',
};
