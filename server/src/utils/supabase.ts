import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// Local storage directory fallback for uploads
export const LOCAL_UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  try {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating uploads directory:', err);
  }
}

export class StorageService {
  /**
   * Uploads a file buffer either to Supabase Storage or to secure local storage.
   * Fails closed in production if persistent cloud storage is not available.
   */
  static async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'documents'
  ): Promise<UploadResult> {
    const sanitizedExt = path.extname(originalName).toLowerCase() || '.pdf';
    const uniqueFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${sanitizedExt}`;
    const isProd = config.nodeEnv === 'production';
    const allowLocalFallback = process.env.ALLOW_LOCAL_STORAGE === 'true' || !isProd;

    // 1. Attempt upload to Supabase Storage if configured
    if (config.supabase.url && config.supabase.serviceRoleKey) {
      try {
        const url = `${config.supabase.url}/storage/v1/object/${config.supabase.storageBucket}/${uniqueFileName}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            'Content-Type': mimeType,
            'x-upsert': 'true',
          },
          body: fileBuffer as any,
        });

        if (response.ok) {
          return {
            fileUrl: uniqueFileName,
            fileName: originalName,
            fileSize: fileBuffer.length,
            mimeType,
          };
        }
        const errorText = await response.text();
        console.error('[Storage] Supabase cloud upload failed:', errorText);

        if (!allowLocalFallback) {
          throw new Error(`Cloud storage upload failed: ${errorText}. Production requires persistent storage.`);
        }
      } catch (supabaseError: any) {
        console.error('[Storage] Supabase connection error:', supabaseError.message);
        if (!allowLocalFallback) {
          throw new Error(`Persistent cloud storage is unavailable: ${supabaseError.message}`);
        }
      }
    } else if (!allowLocalFallback) {
      throw new Error('Supabase Storage credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are missing in production.');
    }

    // 2. Local fallback storage (development only)
    console.warn('[Storage] Storing document in local development uploads directory.');
    const targetPath = path.join(LOCAL_UPLOADS_DIR, path.basename(uniqueFileName));
    await fs.promises.writeFile(targetPath, fileBuffer);

    return {
      fileUrl: `/uploads/${path.basename(uniqueFileName)}`,
      fileName: originalName,
      fileSize: fileBuffer.length,
      mimeType,
    };
  }

  /**
   * Generates a secure, time-limited signed URL for viewing/downloading private documents.
   */
  static async getSignedUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    if (!filePath) return '';

    // If already a full public HTTP URL, return as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    // If it's a Supabase storage path and credentials exist
    if (config.supabase.url && config.supabase.serviceRoleKey && !filePath.startsWith('/uploads/')) {
      try {
        const cleanPath = filePath.replace(/^\/+/, '');
        const signUrl = `${config.supabase.url}/storage/v1/object/sign/${config.supabase.storageBucket}/${cleanPath}`;
        const response = await fetch(signUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: expiresInSeconds }),
        });

        if (response.ok) {
          const data = (await response.json()) as { signedURL: string };
          if (data?.signedURL) {
            return `${config.supabase.url}/storage/v1${data.signedURL}`;
          }
        } else {
          console.warn('[Storage] Failed to generate signed URL from Supabase:', await response.text());
        }
      } catch (err) {
        console.warn('[Storage] Supabase signed URL generation exception:', err);
      }
    }

    // Fallback: direct path
    return filePath;
  }
}
