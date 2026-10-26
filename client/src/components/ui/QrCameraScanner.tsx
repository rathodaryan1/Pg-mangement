import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface QrCameraScannerProps {
  onScan: (decodedToken: string) => void;
  onClose?: () => void;
  scannerId?: string;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  onScan,
  onClose,
  scannerId = 'qr-reader-container',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  const startScanner = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    hasTriggeredRef.current = false;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      // If already scanning, stop first
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        { facingMode: mode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (hasTriggeredRef.current) return;
          hasTriggeredRef.current = true;

          setLastScannedText(decodedText);

          // Clean token from full URL if applicable
          let cleanToken = decodedText.trim();
          if (cleanToken.includes('/gate/verify/')) {
            cleanToken = cleanToken.split('/gate/verify/').pop() || cleanToken;
          }

          // Stop scanner to conserve resources and battery
          if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          setIsScanning(false);

          // Deliver decoded token
          onScan(cleanToken);
        },
        () => {
          // Frame scan error / no QR found in frame (normal)
        }
      );

      setIsScanning(true);
      setCameraPermissionGranted(true);
    } catch (err: any) {
      console.warn('[QrCameraScanner] Camera start error:', err);
      setIsScanning(false);
      setCameraPermissionGranted(false);

      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err?.name === 'NotFoundError' || err?.message?.includes('No camera found')) {
        setCameraError('No video camera device was detected on your system.');
      } else {
        setCameraError(err?.message || 'Unable to access camera video stream.');
      }
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.warn('[QrCameraScanner] Error stopping scanner:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const switchCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await stopScanner();
    await startScanner(nextMode);
  };

  useEffect(() => {
    startScanner(facingMode);

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-4 text-center">
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black aspect-square flex flex-col items-center justify-center">
        {/* HTML5 QR Container */}
        <div id={scannerId} className="w-full h-full" />

        {/* Overlay guides */}
        {isScanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-xl relative shadow-lg">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br -mb-1 -mr-1" />
            </div>
          </div>
        )}

        {/* Loading / Error States inside viewfinder */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-white text-center space-y-3 z-10">
            <CameraOff className="w-10 h-10 text-rose-400" />
            <p className="text-xs font-semibold text-rose-200">{cameraError}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startScanner(facingMode)}
              className="text-white border-white/20 hover:bg-white/10 text-xs"
            >
              Retry Camera Access
            </Button>
          </div>
        )}

        {lastScannedText && (
          <div className="absolute bottom-3 left-3 right-3 bg-emerald-600 text-white p-2 rounded-lg text-xs font-mono truncate z-10 flex items-center justify-center gap-1.5 shadow">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Pass Scanned</span>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="flex items-center justify-center gap-3">
        {isScanning ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={switchCamera}
              className="text-xs"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Flip Camera ({facingMode === 'environment' ? 'Back' : 'Front'})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stopScanner}
              className="text-xs text-rose-600 hover:text-rose-700"
              leftIcon={<CameraOff className="w-3.5 h-3.5" />}
            >
              Stop Camera
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => startScanner(facingMode)}
            className="text-xs bg-[#0B4036] text-white"
            leftIcon={<Camera className="w-3.5 h-3.5" />}
          >
            Start Camera Scanner
          </Button>
        )}

        {onClose && (
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        Position the visitor's digital QR pass inside the frame. Camera feed is decoded entirely on your device.
      </p>
    </div>
  );
};
