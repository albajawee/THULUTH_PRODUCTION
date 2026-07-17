'use client';

import { useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  /** The clickable element that opens the dialog (a button). */
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Styles the confirm button as destructive (red). */
  destructive?: boolean;
  /** Runs on confirm. May be async; the button shows a pending state until it resolves. */
  onConfirm: () => Promise<void> | void;
}

/**
 * A confirmation gate for irreversible or money-moving actions. Controlled internally so callers
 * only supply the trigger and the confirm handler.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="contents">
        {trigger}
      </div>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Cancel
          </DialogClose>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
