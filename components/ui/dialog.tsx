/**
 * Dialog component
 */

import * as React from 'react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogContent({ className = '', children }: DialogContentProps) {
  return (
    <div
      className={`bg-background-elevated border border-border rounded-lg shadow-xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export interface DialogHeaderProps {
  children: React.ReactNode;
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

export interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogTitle({ className = '', children }: DialogTitleProps) {
  return <h2 className={`text-2xl font-bold ${className}`}>{children}</h2>;
}
