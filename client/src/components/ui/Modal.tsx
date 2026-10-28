import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
  showBackButton = false,
  onBack
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
    >
      <div
        className={`w-full ${widthClasses[maxWidth]} max-h-[92vh] flex flex-col bg-white border border-[#DDE2DD] rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-slide-up my-auto relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        {(title || description || showBackButton || showCloseButton) && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#DDE2DD] shrink-0 bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              {showBackButton && (
                <button
                  type="button"
                  onClick={onBack || onClose}
                  className="p-1.5 -ml-1 text-[#68736D] hover:text-[#18231F] rounded-lg hover:bg-[#F8F7F3] transition-colors flex items-center gap-1 text-xs font-semibold"
                  aria-label="Go back"
                >
                  <span className="font-bold">←</span> Back
                </button>
              )}
              <div className="min-w-0">
                {title && <h3 className="text-base sm:text-lg font-bold text-[#18231F] truncate">{title}</h3>}
                {description && <p className="mt-0.5 text-xs text-[#68736D] line-clamp-1">{description}</p>}
              </div>
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#68736D] hover:text-[#18231F] rounded-lg hover:bg-[#F8F7F3] transition-colors shrink-0 ml-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#18231F]">{title}</h3>
          <p className="mt-2 text-xs text-[#68736D]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDE2DD]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
