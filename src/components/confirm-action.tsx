import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  title: string;
  description: string;
  pending?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmAction({ open, title, description, pending = false, error, onCancel, onConfirm }: Props) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog open={open} onOpenChange={value => { if (!value && !pending) onCancel(); }}>
      <AlertDialogContent className="confirmation-dialog" onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus(); }} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="error-notice">{error}</p>}
        <AlertDialogFooter className="gap-2">
          <Button ref={cancel} variant="outline" disabled={pending} onClick={onCancel}>Zrušit</Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>{pending ? "Mažu…" : "Smazat"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}