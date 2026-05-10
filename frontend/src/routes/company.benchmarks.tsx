import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listBenchmarks,
  addBenchmarks,
  updateBenchmark,
  deleteBenchmark,
  deleteAllBenchmarks,
  type ApiBenchmark,
} from "@/lib/api";
import { Eyebrow, DisplayHeading } from "@/components/nocti/primitives";
import { Button } from "@/components/ui/button";
import { EntityFormDialog, type FieldDef } from "@/components/nocti/EntityFormDialog";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/company/benchmarks")({
  head: () => ({
    meta: [
      { title: "Benchmarks — Nocti" },
      { name: "description", content: "Wage benchmarks used for compatibility scoring." },
    ],
  }),
  component: BenchmarksPage,
});

const FIELDS: FieldDef[] = [
  { key: "state", label: "State" },
  { key: "annual_median_wage", label: "Annual median wage", type: "number" },
  { key: "weekly_median_wage", label: "Weekly median wage", type: "number" },
  { key: "year", label: "Year", type: "number" },
];

function BenchmarksPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<ApiBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ApiBenchmark | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const res = await listBenchmarks();
      setRows(res.benchmarks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't load benchmarks";
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { nav({ to: "/company/auth" }); return; }
      void refresh();
    })();
  }, [nav]);

  const onDelete = async (id: number) => {
    if (!confirm("Delete this benchmark?")) return;
    setBusy(true);
    try { await deleteBenchmark(id); toast.success("Benchmark deleted"); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setBusy(false); }
  };

  const onDeleteAll = async () => {
    if (!confirm("Delete ALL benchmarks? This cannot be undone.")) return;
    setBusy(true);
    try { await deleteAllBenchmarks(); toast.success("All benchmarks deleted"); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-serif italic text-xl">Nocti</Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/company/drivers" className="text-muted-foreground hover:text-foreground">Drivers</Link>
              <Link to="/company/jobs" className="text-muted-foreground hover:text-foreground">Jobs</Link>
              <Link to="/company/benchmarks" className="text-foreground">Benchmarks</Link>
              <Link to="/company" className="text-muted-foreground hover:text-foreground">Profile</Link>
              <Link to="/company/map" className="text-muted-foreground hover:text-foreground">Map</Link>
            </nav>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); nav({ to: "/company/auth" }); }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >Sign out</button>
        </div>
      </header>

      <div className="px-6 md:px-10 py-8">
        <Eyebrow>Wage benchmarks</Eyebrow>
        <DisplayHeading className="mt-2 text-3xl sm:text-4xl">Median pay <em className="italic">by state</em>.</DisplayHeading>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setCreating(true)} disabled={busy}>
            <Plus className="h-4 w-4" /> New benchmark
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <div className="flex-1" />
          {rows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => void onDeleteAll()} disabled={busy} className="text-destructive">
              <Trash2 className="h-4 w-4" /> Delete all
            </Button>
          )}
        </div>

        {error && !loading && (
          <div className="mt-6 p-4 text-sm text-destructive border border-destructive/40 rounded-lg">{error}</div>
        )}

        <div className="mt-6 border-y border-border">
          <div className="grid grid-cols-[1fr_1fr_1fr_80px_120px] gap-4 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
            <div>State</div>
            <div>Annual median</div>
            <div>Weekly median</div>
            <div>Year</div>
            <div className="text-right">Actions</div>
          </div>
          {loading && rows.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading benchmarks…
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">No benchmarks yet.</div>
          )}
          {rows.map((b) => (
            <div key={b.id} className="grid grid-cols-[1fr_1fr_1fr_80px_120px] gap-4 px-3 py-3 border-b border-border last:border-b-0 items-center text-sm">
              <div className="font-medium text-foreground">{b.state}</div>
              <div>${b.annual_median_wage?.toLocaleString?.() ?? b.annual_median_wage}</div>
              <div>${b.weekly_median_wage?.toLocaleString?.() ?? b.weekly_median_wage}</div>
              <div className="text-muted-foreground">{b.year}</div>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditing(b)} disabled={busy}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                  <Pencil className="h-3.5 w-3.5" />Edit
                </button>
                <button type="button" onClick={() => void onDelete(b.id)} disabled={busy}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <EntityFormDialog
          open={!!editing}
          onOpenChange={(v) => { if (!v) setEditing(null); }}
          title={`Edit benchmark — ${editing.state} ${editing.year}`}
          fields={FIELDS}
          initial={{
            state: editing.state,
            annual_median_wage: editing.annual_median_wage,
            weekly_median_wage: editing.weekly_median_wage,
            year: editing.year,
          }}
          onSubmit={async (vals) => {
            await updateBenchmark(editing.id, vals as Partial<ApiBenchmark>);
            toast.success("Benchmark updated");
            setEditing(null);
            await refresh();
          }}
        />
      )}

      {creating && (
        <EntityFormDialog
          open={creating}
          onOpenChange={setCreating}
          title="New benchmark"
          fields={FIELDS}
          submitLabel="Create"
          initial={{ state: "", annual_median_wage: 0, weekly_median_wage: 0, year: new Date().getFullYear() }}
          onSubmit={async (vals) => {
            await addBenchmarks([vals as Partial<ApiBenchmark>]);
            toast.success("Benchmark created");
            setCreating(false);
            await refresh();
          }}
        />
      )}
    </main>
  );
}