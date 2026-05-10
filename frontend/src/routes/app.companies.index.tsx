import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Eyebrow, DisplayHeading } from "@/components/nocti/primitives";
import { CompanyCard } from "@/components/nocti/CompanyCard";
import { companies } from "@/data/mock";
import { SlidersHorizontal } from "lucide-react";
import { computeMatch } from "@/lib/match";
import { useDriver } from "@/lib/driver-context";

export const Route = createFileRoute("/app/companies/")({
  head: () => ({ meta: [{ title: "Companies — Nocti" }, { name: "description", content: "Carriers matched to your lanes, pay, and home time." }] }),
  component: Companies,
});

type Sort = "match" | "pay" | "distance";

function Companies() {
  const { driver } = useDriver();
  const [sort, setSort] = useState<Sort>("match");
  const [equip, setEquip] = useState<string | null>(null);

  const list = useMemo(() => {
    // Score every company once against the current driver — re-runs whenever
    // `driver` changes, so editing the profile re-sorts instantly.
    const scored = companies.map((c) => ({
      company: c,
      score: computeMatch(driver, c).match_score,
    }));
    let l = equip ? scored.filter((s) => s.company.equipment.includes(equip)) : scored;
    if (sort === "match") l = [...l].sort((a, b) => b.score - a.score);
    if (sort === "pay") l = [...l].sort((a, b) => b.company.payMax - a.company.payMax);
    if (sort === "distance") l = [...l].sort((a, b) => a.company.distanceMi - b.company.distanceMi);
    return l;
  }, [sort, equip, driver]);

  const equipOptions = ["Dry van", "Reefer", "Flatbed"];

  return (
    <div className="px-5 pt-8 pb-12">
      <Eyebrow>Carriers</Eyebrow>
      <DisplayHeading as="h2" className="mt-3">
        {companies.length} carriers <em className="italic">matched</em> to you.
      </DisplayHeading>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto -mx-5 px-5 scrollbar-none">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
        {(["match", "pay", "distance"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${
              sort === s ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground"
            }`}
          >
            {s === "match" ? "Best match" : s === "pay" ? "Highest pay" : "Closest"}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border shrink-0" />
        {equipOptions.map((e) => (
          <button
            key={e}
            onClick={() => setEquip(equip === e ? null : e)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${
              equip === e ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground"
            }`}
          >{e}</button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {list.map(({ company, score }) => (
          <CompanyCard key={company.id} company={company} matchScore={score} />
        ))}
      </div>
    </div>
  );
}
