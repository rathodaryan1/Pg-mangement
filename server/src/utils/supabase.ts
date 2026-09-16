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
const LOCAL_UPLOADS_DIR = path.join(__dirname, '../../uploads');
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
   */
  static async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'documents'
  ): Promise<UploadResult> {
    const sanitizedExt = path.extname(originalName).toLowerCase() || '.pdf';
    const uniqueFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${sanitizedExt}`;

    // If Supabase Storage credentials are fully provided
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
        console.warn('[Storage] Supabase upload failed, falling back to local secure storage:', await response.text());
      } catch (supabaseError) {
        console.warn('[Storage] Supabase connection failed, using local storage:', supabaseError);
      }
    }

    // Secure local fallback storage
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
    if (config.supabase.url && config.supabase.serviceRoleKey && !filePath.startsWith('/uploads/')) {
      try {
        const signUrl = `${config.supabase.url}/storage/v1/object/sign/${config.supabase.storageBucket}/${filePath}`;
        const response = await fetch(signUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: expiresInSeconds }),
        });

        if (response.ok) {
          const data = await response.json() as { signedURL: string };
          return `${config.supabase.url}/storage/v1${data.signedURL}`;
        }
      } catch (err) {
        console.warn('[Storage] Failed to generate signed URL from Supabase:', err);
      }
    }

    // Fallback: direct API stream route or relative path
    return filePath;
  }
}
