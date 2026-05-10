import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "checkbox";
  placeholder?: string;
};

type Props<T extends Record<string, unknown>> = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initial: T;
  onSubmit: (values: T) => Promise<void> | void;
  submitLabel?: string;
};

export function EntityFormDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  submitLabel = "Save",
}: Props<T>) {
  const [values, setValues] = useState<T>(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }) as T);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => {
            const v = values[f.key];
            if (f.type === "textarea") {
              return (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  <Textarea
                    value={(v as string | null) ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={4}
                  />
                </div>
              );
            }
            if (f.type === "checkbox") {
              return (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!v}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                  {f.label}
                </label>
              );
            }
            return (
              <div key={f.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <Input
                  type={f.type ?? "text"}
                  value={v == null ? "" : String(v)}
                  placeholder={f.placeholder}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (f.type === "number") {
                      set(f.key, raw === "" ? null : Number(raw));
                    } else {
                      set(f.key, raw);
                    }
                  }}
                />
              </div>
            );
          })}
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}