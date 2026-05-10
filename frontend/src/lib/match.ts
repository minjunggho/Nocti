import type { Company, Driver, HomeTimePolicy } from "@/data/mock";

export type FactorKey =
  | "lane_overlap"
  | "pay_alignment"
  | "home_time"
  | "equipment"
  | "experience"
  | "benefits"
  | "geographic";

export type Factor = { score: number; weight: number; detail: string; label: string };

export type MatchResult = {
  match_score: number;
  factors: Record<FactorKey, Factor>;
  hard_disqualifiers: string[];
  top_reasons: string[];
};

const WEIGHTS: Record<FactorKey, number> = {
  lane_overlap: 30,
  pay_alignment: 20,
  home_time: 15,
  equipment: 10,
  experience: 10,
  benefits: 10,
  geographic: 5,
};

const LABELS: Record<FactorKey, string> = {
  lane_overlap: "Lane overlap",
  pay_alignment: "Pay alignment",
  home_time: "Home time fit",
  equipment: "Equipment match",
  experience: "Experience fit",
  benefits: "Benefits overlap",
  geographic: "Geographic fit",
};

const HOME_TIME_AXIS: HomeTimePolicy[] = ["daily", "weekly", "biweekly", "OTR"];

const BENEFIT_ALIASES: Record<string, string> = {
  health: "health insurance",
  "health insurance": "health insurance",
  dental: "dental",
  vision: "vision",
  "401k": "401k match",
  "401k match": "401k match",
  "401k 4% match": "401k match",
  pto: "paid pto",
  "paid pto": "paid pto",
  "per diem": "per diem",
  "sign-on bonus": "sign-on bonus",
  "$3k sign-on": "sign-on bonus",
  "$5k sign-on": "sign-on bonus",
  "tarp pay": "tarp pay",
};

const norm = (s: string) => BENEFIT_ALIASES[s.trim().toLowerCase()] ?? s.trim().toLowerCase();
const normSet = (xs: string[]) => new Set(xs.map((x) => x.trim().toLowerCase()));
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
};

export function computeMatch(driver: Driver, company: Company): MatchResult {
  const hardDisqualifiers: string[] = [];

  // 1. Lane overlap (Jaccard)
  const dLanes = normSet(driver.preferences.preferredLanes);
  const cLanes = normSet(company.lanes);
  const laneJacc = jaccard(dLanes, cLanes);
  let inter = 0;
  for (const l of dLanes) if (cLanes.has(l)) inter++;
  const laneScore = Math.round(laneJacc * 100);
  const laneDetail =
    inter > 0
      ? `${inter} of your preferred lanes overlap (${Array.from(dLanes).filter((l) => cLanes.has(l)).slice(0, 3).join(", ")})`
      : "No overlap with your preferred lanes";

  // Avoid-lane hard penalty
  const avoid = normSet(driver.preferences.avoidLanes);
  const avoidHits: string[] = [];
  for (const l of cLanes) for (const a of avoid) if (l.includes(a) || a.includes(l)) avoidHits.push(a);
  let lanePenalty = 0;
  if (avoidHits.length > 0) {
    lanePenalty = 15;
    hardDisqualifiers.push(`Runs ${avoidHits[0]} — you said you won't run that`);
  }

  // 2. Pay alignment
  const dMin = driver.desiredPayMin, dMax = driver.desiredPayMax;
  const cMin = company.payMin, cMax = company.payMax;
  let payScore = 0;
  let payDetail = "";
  if (cMax < dMin) {
    payScore = 0;
    payDetail = `Pays $${cMin.toFixed(2)}–$${cMax.toFixed(2)}, below your floor of $${dMin.toFixed(2)}`;
  } else if (cMin >= dMin && cMax >= dMax) {
    payScore = 100;
    payDetail = `Pay range covers your desired $${dMin.toFixed(2)}–$${dMax.toFixed(2)}`;
  } else {
    // Partial overlap — measure as fraction of driver's range that the company covers
    const overlapLo = Math.max(dMin, cMin);
    const overlapHi = Math.min(dMax, cMax);
    const overlap = Math.max(0, overlapHi - overlapLo);
    const driverRange = Math.max(0.0001, dMax - dMin);
    payScore = Math.round((overlap / driverRange) * 100);
    payDetail = `Partial overlap with your $${dMin.toFixed(2)}–$${dMax.toFixed(2)} range`;
  }
  if (cMax > dMax * 1.10) {
    payScore = Math.min(100, payScore + 10);
    payDetail += ` · top end $${cMax.toFixed(2)} beats your target by 10%+`;
  }

  // 3. Home time fit
  const dHt = driver.desiredHomeTime;
  const cHt = company.homeTimePolicy;
  const di = HOME_TIME_AXIS.indexOf(dHt);
  const ci = HOME_TIME_AXIS.indexOf(cHt);
  let htScore = 0;
  if (di === ci) htScore = 100;
  else if (Math.abs(di - ci) === 1) htScore = 50;
  else htScore = 0;
  const htDetail =
    htScore === 100
      ? `${company.homeTime} — exactly what you want`
      : htScore === 50
        ? `${company.homeTime} — close to your preference`
        : `${company.homeTime} — doesn't match your preference`;

  // 4. Equipment match (with required endorsement gate)
  const dEnd = normSet(driver.endorsements);
  const reqEnd = normSet(company.requiredEndorsements);
  const missing = Array.from(reqEnd).filter((e) => !dEnd.has(e));
  let eqScore = 0;
  let eqDetail = "";
  if (missing.length > 0) {
    eqScore = 0;
    eqDetail = `Missing required endorsement: ${missing.join(", ")}`;
    hardDisqualifiers.push(`Missing ${missing.join(", ")} endorsement`);
  } else {
    const dEq = normSet(driver.preferences.equipment);
    const cEq = normSet(company.equipment);
    eqScore = Math.round(jaccard(dEq, cEq) * 100);
    const shared = Array.from(dEq).filter((x) => cEq.has(x));
    eqDetail = shared.length
      ? `You both run ${shared.join(", ")}`
      : `You prefer ${Array.from(dEq).join(", ")}; they run ${Array.from(cEq).join(", ")}`;
  }

  // 5. Experience fit
  const [eMin, eMax] = company.experienceRange;
  const ye = driver.yearsExp;
  let expScore = 0;
  let expDetail = "";
  if (ye >= eMin && ye <= eMax) {
    expScore = 100;
    expDetail = `${ye} years — inside their ${eMin}–${eMax} year range`;
  } else {
    const out = ye < eMin ? eMin - ye : ye - eMax;
    expScore = Math.max(0, 100 - 10 * out);
    expDetail = `${ye} years vs their ${eMin}–${eMax} preferred (${out} yr out)`;
  }

  // 6. Benefits overlap
  const wanted = driver.benefitsWanted.map(norm);
  const offered = new Set(company.benefits.map(norm));
  const matched = wanted.filter((w) => offered.has(w));
  const benScore = wanted.length === 0 ? 0 : Math.round((matched.length / wanted.length) * 100);
  const benDetail =
    matched.length > 0
      ? `${matched.length} of ${wanted.length} you want: ${matched.slice(0, 3).join(", ")}`
      : `None of your wanted benefits listed`;

  // 7. Geographic fit
  const d = company.distanceMi;
  let geoScore = 10;
  if (d < 100) geoScore = 100;
  else if (d < 300) geoScore = 70;
  else if (d < 500) geoScore = 40;
  const geoDetail = `${d} mi from ${driver.homeBase}`;

  const factors: Record<FactorKey, Factor> = {
    lane_overlap: { score: laneScore, weight: WEIGHTS.lane_overlap, detail: laneDetail, label: LABELS.lane_overlap },
    pay_alignment: { score: payScore, weight: WEIGHTS.pay_alignment, detail: payDetail, label: LABELS.pay_alignment },
    home_time: { score: htScore, weight: WEIGHTS.home_time, detail: htDetail, label: LABELS.home_time },
    equipment: { score: eqScore, weight: WEIGHTS.equipment, detail: eqDetail, label: LABELS.equipment },
    experience: { score: expScore, weight: WEIGHTS.experience, detail: expDetail, label: LABELS.experience },
    benefits: { score: benScore, weight: WEIGHTS.benefits, detail: benDetail, label: LABELS.benefits },
    geographic: { score: geoScore, weight: WEIGHTS.geographic, detail: geoDetail, label: LABELS.geographic },
  };

  const weighted = (Object.values(factors) as Factor[]).reduce(
    (acc, f) => acc + (f.score * f.weight) / 100,
    0,
  );
  const match_score = Math.max(0, Math.min(100, Math.round(weighted - lanePenalty)));

  // Top reasons — strongest 3 by score × weight, only if score >= 50
  const ranked = (Object.entries(factors) as [FactorKey, Factor][])
    .map(([k, f]) => ({ k, f, w: f.score * f.weight }))
    .filter((x) => x.f.score >= 50)
    .sort((a, b) => b.w - a.w)
    .slice(0, 3);
  const top_reasons = ranked.map(({ f }) => f.detail);

  return { match_score, factors, hard_disqualifiers: hardDisqualifiers, top_reasons };
}

export const FACTOR_ORDER: FactorKey[] = [
  "lane_overlap",
  "pay_alignment",
  "home_time",
  "equipment",
  "experience",
  "benefits",
  "geographic",
];
