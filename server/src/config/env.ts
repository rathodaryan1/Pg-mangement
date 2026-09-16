import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  directUrl?: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  supabase: {
    url?: string;
    anonKey?: string;
    serviceRoleKey?: string;
    storageBucket: string;
  };
  razorpay: {
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
  };
}

const isProd = process.env.NODE_ENV === 'production';

const getEnv = (key: string, devDefault?: string): string => {
  const value = process.env[key];
  if (!value) {
    if (isProd) {
      // In production, critical variables like JWT_SECRET or DATABASE_URL cannot use hardcoded fallbacks
      if (devDefault === undefined) {
        throw new Error(`CRITICAL DEPLOYMENT ERROR: Environment variable "${key}" is missing in production.`);
      }
    }
    return devDefault || '';
  }
  return value;
};

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: getEnv('DATABASE_URL', isProd ? undefined : 'postgresql://postgres:postgres@localhost:5432/urbannest_pg?schema=public'),
  directUrl: process.env.DIRECT_URL,
  jwtSecret: getEnv('JWT_SECRET', isProd ? undefined : 'urban_nest_jwt_secret_dev_key_2026'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'resident-documents',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
};

export default config;
