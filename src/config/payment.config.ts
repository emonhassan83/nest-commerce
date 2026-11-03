import { registerAs } from '@nestjs/config';
import { getEnvOrDefault } from './app.config.js';

export interface PaymentConfig {
  stripePublishableKey: string;
  stripeSecretKey: string;
  successUrl: string;
  cancelUrl: string;
}

export default registerAs(
  'payment',
  (): PaymentConfig => ({
    stripePublishableKey: getEnvOrDefault(
      'STRIPE_API_KEY',
      getEnvOrDefault('STRIPE_PUBLISHABLE_KEY', 'pk_test_placeholder'),
    ),
    stripeSecretKey: getEnvOrDefault(
      'STRIPE_API_SECRET',
      getEnvOrDefault('STRIPE_SECRET_KEY', 'sk_test_placeholder'),
    ),
    successUrl: getEnvOrDefault(
      'STRIPE_SUCCESS_URL',
      'http://localhost:5173/payment/success',
    ),
    cancelUrl: getEnvOrDefault(
      'STRIPE_CANCEL_URL',
      'http://localhost:5173/payment/cancel',
    ),
  }),
);

