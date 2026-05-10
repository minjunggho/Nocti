import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listJobs,
  createJob,
  updateJob,
  deleteJob,
  deleteAllJobs,
  scrapeJobs,
  type ApiJob,
  type ScrapeRequest,
} from "@/lib/api";
import { Eyebrow, DisplayHeading } from "@/components/nocti/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityFormDialog, type FieldDef } from "@/components/nocti/EntityFormDialog";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/company/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — Nocti" },
      { name: "description", content: "Manage scraped and posted driver jobs." },
    ],
  }),
  component: JobsPage,
});

const JOB_FIELDS: FieldDef[] = [
  { key: "company_name", label: "Company name" },
  { key: "job_title", label: "Job title" },
  { key: "location", label: "Location" },
  { key: "state", label: "State" },
  { key: "source_url", label: "Source URL" },
  { key: "salary_text", label: "Salary text" },
  { key: "employment_type", label: "Employment type" },
  { key: "rating", label: "Rating", type: "number" },
  { key: "route_type", label: "Route type" },
  { key: "equipment_type", label: "Equipment type" },
  { key: "home_time", label: "Home time" },
  { key: "pay_model", label: "Pay model" },
  { key: "estimated_weekly_pay", label: "Estimated weekly pay", type: "number" },
  { key: "experience_required", label: "Experience required" },
  { key: "benefits_mentioned", label: "Benefits mentioned" },
  { key: "detention_pay_mentioned", label: "Detention pay mentioned", type: "checkbox" },
  { key: "job_description", label: "Job description", type: "textarea" },
];

function emptyJob(): Partial<ApiJob> {
  return {
    company_name: "",
    job_title: "",
    location: "",
    state: "",
    source_url: "",
    salary_text: "",
    job_description: "",
    employment_type: "",
    route_type: "",
    equipment_type: "",
    home_time: "",
    pay_model: "",
    experience_required: "",
    benefits_mentioned: "",
    detention_pay_mentioned: false,
  };
}

function JobsPage() {
  const nav = useNavigate();
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ApiJob | null>(null);
  const [creating, setCreating] = useState(false);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [scrape, setScrape] = useState<ScrapeRequest>({
    position: "truck driver",
    location: "California",
    max_items: 5,
  });

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const res = await listJobs();
      setJobs(res.jobs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't load jobs";
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
    if (!confirm("Delete this job?")) return;
    setBusy(true);
    try { await deleteJob(id); toast.success("Job deleted"); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setBusy(false); }
  };

  const onDeleteAll = async () => {
    if (!confirm("Delete ALL jobs? This cannot be undone.")) return;
    setBusy(true);
    try { await deleteAllJobs(); toast.success("All jobs deleted"); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
    finally { setBusy(false); }
  };

  const onRunScrape = async () => {
    setBusy(true);
    try {
      await scrapeJobs(scrape);
      toast.success("Scrape kicked off");
      setScrapeOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scrape failed");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-serif italic text-xl">Nocti</Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/company/drivers" className="text-muted-foreground hover:text-foreground">Drivers</Link>
              <Link to="/company/jobs" className="text-foreground">Jobs</Link>
              <Link to="/company/benchmarks" className="text-muted-foreground hover:text-foreground">Benchmarks</Link>
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
        <Eyebrow>Job catalog</Eyebrow>
        <DisplayHeading className="mt-2 text-3xl sm:text-4xl">Jobs <em className="italic">in the pipeline</em>.</DisplayHeading>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setCreating(true)} disabled={busy}>
            <Plus className="h-4 w-4" /> New job
          </Button>
          <Button size="sm" variant="outline" onClick={() => setScrapeOpen(true)} disabled={busy}>
            <Download className="h-4 w-4" /> Scrape jobs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <div className="flex-1" />
          {jobs.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => void onDeleteAll()} disabled={busy} className="text-destructive">
              <Trash2 className="h-4 w-4" /> Delete all
            </Button>
          )}
        </div>

        {error && !loading && (
          <div className="mt-6 p-4 text-sm text-destructive border border-destructive/40 rounded-lg">{error}</div>
        )}

        <div className="mt-6 divide-y divide-border border-y border-border">
          {loading && jobs.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading jobs…
            </div>
          )}
          {!loading && jobs.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">No jobs yet. Create one or scrape some.</div>
          )}
          {jobs.map((j) => (
            <div key={j.id} className="py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h3 className="font-serif text-lg text-foreground truncate">
                    {j.company_name ?? "Unnamed carrier"}
                  </h3>
                  {j.job_title && <span className="text-sm text-muted-foreground truncate">{j.job_title}</span>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[j.location, j.state, j.salary_text, j.equipment_type, j.route_type].filter(Boolean).join(" · ") || "—"}
                </p>
                {j.source_url && (
                  <a href={j.source_url} target="_blank" rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setEditing(j)} disabled={busy}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                  <Pencil className="h-3.5 w-3.5" />Edit
                </button>
                <button type="button" onClick={() => void onDelete(j.id)} disabled={busy}
                  className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50">
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
          title={`Edit job — ${editing.job_title ?? editing.id}`}
          fields={JOB_FIELDS}
          initial={editing as unknown as Record<string, unknown>}
          onSubmit={async (vals) => {
            await updateJob(editing.id, vals as Partial<ApiJob>);
            toast.success("Job updated");
            setEditing(null);
            await refresh();
          }}
        />
      )}

      {creating && (
        <EntityFormDialog
          open={creating}
          onOpenChange={setCreating}
          title="New job"
          fields={JOB_FIELDS}
          initial={emptyJob() as unknown as Record<string, unknown>}
          submitLabel="Create"
          onSubmit={async (vals) => {
            await createJob(vals as Partial<ApiJob>);
            toast.success("Job created");
            setCreating(false);
            await refresh();
          }}
        />
      )}

      {scrapeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setScrapeOpen(false)}>
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-lg">Scrape jobs</h2>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Position</label>
              <Input value={scrape.position ?? ""} onChange={(e) => setScrape({ ...scrape, position: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Location</label>
              <Input value={scrape.location ?? ""} onChange={(e) => setScrape({ ...scrape, location: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Max items</label>
              <Input type="number" value={scrape.max_items ?? 5}
                onChange={(e) => setScrape({ ...scrape, max_items: Number(e.target.value) })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setScrapeOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={() => void onRunScrape()} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Run scrape
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}