import { Link } from "@tanstack/react-router";
import { MapPin, Clock, DollarSign } from "lucide-react";
import { Company } from "@/data/mock";
import { MatchBadge, NCard, Chip } from "./primitives";
import { computeMatch } from "@/lib/match";
import { useDriver } from "@/lib/driver-context";
import { useMemo } from "react";

export function CompanyCard({ company, matchScore }: { company: Company; matchScore?: number }) {
  const { driver } = useDriver();
  const match = useMemo(
    () => matchScore ?? computeMatch(driver, company).match_score,
    [matchScore, driver, company],
  );
  return (
    <Link
      to="/driver/carriers/$id"
      params={{ id: company.id }}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <NCard className="p-4 hover:bg-muted/40 transition-colors">
        <div className="flex items-start gap-3">
          <img src={company.logo} alt="" className="h-12 w-12 rounded-md flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-lg leading-tight text-foreground truncate">{company.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{company.hq} · {company.fleet} trucks</p>
              </div>
              <MatchBadge value={match} />
            </div>
            <p className="mt-2 text-sm text-body line-clamp-2">{company.headline}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-body">
              <span className="inline-flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" />{company.payRange}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{company.homeTime}</span>
              <span className="inline-flex items-center gap-1.5 col-span-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{company.lanes.slice(0, 2).join(" · ")}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {company.benefits.slice(0, 3).map((b) => <Chip key={b}>{b}</Chip>)}
            </div>
          </div>
        </div>
      </NCard>
    </Link>
  );
}