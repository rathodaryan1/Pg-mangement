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
  };
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`CRITICAL CONFIG ERROR: Environment variable "${key}" is required.`);
    }
    return '';
  }
  return value;
};

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/urbannest_pg?schema=public'),
  directUrl: process.env.DIRECT_URL,
  jwtSecret: getEnv('JWT_SECRET', 'urban_nest_jwt_secret_dev_key_2026'),
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
  },
};
