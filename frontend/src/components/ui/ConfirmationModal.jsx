import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
}) {
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const footer = (
    <>
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button
        variant={isDanger ? 'danger' : isWarning ? 'primary' : 'primary'}
        onClick={onConfirm}
        loading={loading}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-panel shrink-0 ${
          isDanger 
            ? 'bg-app-danger-subtle text-app-danger' 
            : isWarning 
            ? 'bg-app-warning-subtle text-app-warning' 
            : 'bg-app-primary-subtle text-app-primary'
        }`}>
          {isDanger && <AlertTriangle size={22} />}
          {isWarning && <AlertCircle size={22} />}
          {!isDanger && !isWarning && <Info size={22} />}
        </div>
        <div className="flex-1 text-small text-app-text-secondary leading-relaxed pt-0.5">
          {message}
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmationModal;
