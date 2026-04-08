import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm' }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-400 rounded-full">
            <X size={20} />
          </button>
        </div>
        <p className="text-neutral-400 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </Card>
    </div>
  );
}
