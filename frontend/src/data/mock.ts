export type Status = "Looking" | "Open to offers" | "Employed";
export type HomeTimePolicy = "daily" | "weekly" | "biweekly" | "OTR";

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  yearsExp: number;
  homeBase: string;
  status: Status;
  photo: string;
  about: string;
  endorsements: string[];
  experience: { company: string; lanes: string; equipment: string; tenure: string }[];
  preferences: {
    payPerMile: string;
    homeTime: string;
    preferredLanes: string[];
    avoidLanes: string[];
    equipment: string[];
  };
  desiredHomeTime: HomeTimePolicy;
  desiredPayMin: number;
  desiredPayMax: number;
  benefitsWanted: string[];
  documents: { name: string; status: string }[];
};

export const currentDriver: Driver = {
  id: "drv_1",
  firstName: "Marcus",
  lastName: "Reed",
  phone: "+1 (555) 214-9087",
  yearsExp: 12,
  homeBase: "Knoxville, TN",
  status: "Looking",
  photo: "",
  about:
    "12 years OTR, mostly southeast regional dry van. Clean record, no accidents. Looking for steady home time and respect.",
  endorsements: ["CDL-A", "Hazmat", "TWIC", "Doubles/Triples"],
  experience: [
    { company: "Werner Enterprises", lanes: "TN ↔ TX, SE regional", equipment: "Dry van", tenure: "2019 – Present" },
    { company: "Schneider", lanes: "OTR 48 states", equipment: "Reefer", tenure: "2014 – 2019" },
    { company: "Local LTL", lanes: "Knoxville metro", equipment: "Day cab", tenure: "2012 – 2014" },
  ],
  preferences: {
    payPerMile: "0.65 – 0.78",
    homeTime: "Home weekly",
    preferredLanes: ["SE regional", "TN ↔ TX", "TN ↔ FL"],
    avoidLanes: ["Northeast", "NYC metro"],
    equipment: ["Dry van", "Reefer"],
  },
  desiredHomeTime: "weekly",
  desiredPayMin: 0.65,
  desiredPayMax: 0.78,
  benefitsWanted: ["Health insurance", "401k match", "Paid PTO", "Per diem", "Sign-on bonus"],
  documents: [
    { name: "CDL-A License", status: "Verified" },
    { name: "Medical Card", status: "Verified" },
    { name: "MVR (12 mo)", status: "Pending" },
  ],
};

// Home base coordinates for the seeded driver
export const currentDriverGeo = { lat: 35.9606, lng: -83.9207 }; // Knoxville, TN

// Mock pool of drivers — used by the company-side map.
// Anonymized first names + masked last initial when privacy is on.
export type MockDriver = Driver & { lat: number; lng: number };

export const mockDrivers: MockDriver[] = [
  { ...currentDriver, lat: 35.9606, lng: -83.9207 },
  {
    id: "drv_2", firstName: "Tasha", lastName: "Hill", phone: "+1 (555) 332-1100",
    yearsExp: 7, homeBase: "Atlanta, GA", status: "Open to offers", photo: "",
    about: "7 years reefer, FL produce specialist.",
    endorsements: ["CDL-A", "Tanker"],
    experience: [{ company: "Prime Inc.", lanes: "FL produce, SE", equipment: "Reefer", tenure: "2018 – Present" }],
    preferences: { payPerMile: "0.70 – 0.85", homeTime: "Home weekly", preferredLanes: ["FL produce", "SE → Midwest"], avoidLanes: ["Northeast"], equipment: ["Reefer"] },
    desiredHomeTime: "weekly", desiredPayMin: 0.70, desiredPayMax: 0.85,
    benefitsWanted: ["Health insurance", "401k match", "Per diem"],
    documents: [{ name: "CDL-A License", status: "Verified" }],
    lat: 33.7490, lng: -84.3880,
  },
  {
    id: "drv_3", firstName: "Devon", lastName: "Brooks", phone: "+1 (555) 887-2210",
    yearsExp: 3, homeBase: "Nashville, TN", status: "Looking", photo: "",
    about: "3 years dry van, looking for steady weekly home time.",
    endorsements: ["CDL-A"],
    experience: [{ company: "Blue Forge Freight", lanes: "TN ↔ OH, Midwest", equipment: "Dry van", tenure: "2022 – Present" }],
    preferences: { payPerMile: "0.62 – 0.72", homeTime: "Home weekly", preferredLanes: ["TN ↔ OH", "Midwest"], avoidLanes: [], equipment: ["Dry van"] },
    desiredHomeTime: "weekly", desiredPayMin: 0.62, desiredPayMax: 0.72,
    benefitsWanted: ["Health insurance", "Paid PTO"],
    documents: [{ name: "CDL-A License", status: "Verified" }],
    lat: 36.1627, lng: -86.7816,
  },
  {
    id: "drv_4", firstName: "Aaron", lastName: "Klein", phone: "+1 (555) 410-9081",
    yearsExp: 18, homeBase: "Birmingham, AL", status: "Open to offers", photo: "",
    about: "18 years flatbed. Tarp-pay-or-walk.",
    endorsements: ["CDL-A", "Hazmat", "Tanker"],
    experience: [{ company: "Summit Haul Co.", lanes: "SE → TX", equipment: "Flatbed", tenure: "2010 – Present" }],
    preferences: { payPerMile: "0.78 – 0.90", homeTime: "Home bi-weekly", preferredLanes: ["SE → TX", "SE → Midwest"], avoidLanes: ["NYC metro"], equipment: ["Flatbed", "Step deck"] },
    desiredHomeTime: "biweekly", desiredPayMin: 0.78, desiredPayMax: 0.90,
    benefitsWanted: ["Health insurance", "401k match", "Tarp pay"],
    documents: [{ name: "CDL-A License", status: "Verified" }],
    lat: 33.5186, lng: -86.8104,
  },
  {
    id: "drv_5", firstName: "Maria", lastName: "Solano", phone: "+1 (555) 220-7733",
    yearsExp: 5, homeBase: "Memphis, TN", status: "Looking", photo: "",
    about: "5 years OTR, ready to come home weekly.",
    endorsements: ["CDL-A"],
    experience: [{ company: "Cedarline Express", lanes: "TN ↔ AR, SE regional", equipment: "Dry van", tenure: "2020 – Present" }],
    preferences: { payPerMile: "0.65 – 0.74", homeTime: "Home weekly", preferredLanes: ["SE regional", "TN ↔ AR"], avoidLanes: [], equipment: ["Dry van"] },
    desiredHomeTime: "weekly", desiredPayMin: 0.65, desiredPayMax: 0.74,
    benefitsWanted: ["Health insurance", "Paid PTO"],
    documents: [{ name: "CDL-A License", status: "Verified" }],
    lat: 35.1495, lng: -90.0490,
  },
  {
    id: "drv_6", firstName: "Wes", lastName: "Patel", phone: "+1 (555) 901-3344",
    yearsExp: 9, homeBase: "Louisville, KY", status: "Open to offers", photo: "",
    about: "9 years OTR. 48-state, will run anywhere east of the Rockies.",
    endorsements: ["CDL-A", "Doubles/Triples"],
    experience: [{ company: "Northstar Transport", lanes: "48 states OTR", equipment: "Dry van", tenure: "2016 – Present" }],
    preferences: { payPerMile: "0.65 – 0.75", homeTime: "Home every 14 days", preferredLanes: ["48 states OTR", "Midwest"], avoidLanes: [], equipment: ["Dry van"] },
    desiredHomeTime: "OTR", desiredPayMin: 0.65, desiredPayMax: 0.75,
    benefitsWanted: ["Health insurance", "Dental", "401k match"],
    documents: [{ name: "CDL-A License", status: "Verified" }],
    lat: 38.2527, lng: -85.7585,
  },
  {
    id: "drv_7", firstName: "Janelle", lastName: "Owens", phone: "+1 (555) 661-2204",
    yearsExp: 2, homeBase: "Chattanooga, TN", status: "Looking", photo: "",
    about: "2 years dry van. Looking for a family-feel carrier.",
    endorsements: ["CDL-A"],
    experience: [{ company: "Ridgeline Carriers", lanes: "SE regional", equipment: "Dry van", tenure: "2023 – Present" }],
    preferences: { payPerMile: "0.60 – 0.72", homeTime: "Home weekly", preferredLanes: ["SE regional", "TN ↔ FL"], avoidLanes: ["Northeast"], equipment: ["Dry van"] },
    desiredHomeTime: "weekly", desiredPayMin: 0.60, desiredPayMax: 0.72,
    benefitsWanted: ["Health insurance", "Paid PTO", "Sign-on bonus"],
    documents: [{ name: "CDL-A License", status: "Verified" }],
    lat: 35.0456, lng: -85.3097,
  },
];

// Mock high-demand lanes with origin/destination coordinates for arc overlay.
export const demandLanes: { id: string; label: string; from: [number, number]; to: [number, number]; rate: number }[] = [
  { id: "atl-dal", label: "Atlanta → Dallas", from: [33.7490, -84.3880], to: [32.7767, -96.7970], rate: 2.71 },
  { id: "mem-chi", label: "Memphis → Chicago", from: [35.1495, -90.0490], to: [41.8781, -87.6298], rate: 2.55 },
  { id: "knx-mia", label: "Knoxville → Miami", from: [35.9606, -83.9207], to: [25.7617, -80.1918], rate: 2.84 },
  { id: "nas-hou", label: "Nashville → Houston", from: [36.1627, -86.7816], to: [29.7604, -95.3698], rate: 2.62 },
  { id: "atl-cin", label: "Atlanta → Cincinnati", from: [33.7490, -84.3880], to: [39.1031, -84.5120], rate: 2.48 },
];

// Average rate-per-mile by region (used as colored circles for the choropleth-lite overlay).
export const regionalRates: { id: string; label: string; center: [number, number]; rate: number }[] = [
  { id: "se", label: "Southeast", center: [33.5, -84.4], rate: 2.68 },
  { id: "mw", label: "Midwest", center: [40.0, -88.0], rate: 2.42 },
  { id: "tx", label: "Texas / Gulf", center: [31.0, -97.5], rate: 2.55 },
  { id: "ne", label: "Northeast", center: [40.7, -74.0], rate: 2.81 },
  { id: "fl", label: "Florida", center: [28.0, -81.7], rate: 2.74 },
];

export type Company = {
  id: string;
  name: string;
  logo: string;
  headline: string;
  hq: string;
  fleet: number;
  dot: string;
  mc: string;
  payRange: string;
  payMin: number;
  payMax: number;
  homeTime: string;
  homeTimePolicy: HomeTimePolicy;
  benefits: string[];
  lanes: string[];
  equipment: string[];
  requiredEndorsements: string[];
  experienceRange: [number, number];
  terminals: string[];
  fmcsa: { safety: string; authority: string; inspections24mo: number; oosRate: string };
  about: string;
  distanceMi: number;
  lat: number;
  lng: number;
};

const logo = (text: string, color = "#0A0A0A") =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='${color}'/><text x='50%' y='54%' text-anchor='middle' font-family='Playfair Display, Georgia, serif' font-style='italic' font-size='28' fill='white'>${text}</text></svg>`
  )}`;

export const companies: Company[] = [
  {
    id: "ridgeline",
    name: "Ridgeline Carriers",
    logo: logo("R"),
    headline: "Family-owned regional carrier. Drivers home every weekend.",
    hq: "Chattanooga, TN",
    fleet: 38,
    dot: "DOT 2148391",
    mc: "MC 762184",
    payRange: "$0.72 – $0.78 / mi",
    payMin: 0.72, payMax: 0.78,
    homeTime: "Home weekly",
    homeTimePolicy: "weekly",
    benefits: ["Health", "401k 4% match", "PTO", "Per diem", "$3k sign-on"],
    lanes: ["TN ↔ TX", "TN ↔ FL", "SE regional"],
    equipment: ["Dry van"],
    requiredEndorsements: [],
    experienceRange: [2, 30],
    terminals: ["Chattanooga, TN", "Nashville, TN"],
    fmcsa: { safety: "Satisfactory", authority: "Active", inspections24mo: 142, oosRate: "1.4%" },
    about:
      "Ridgeline is a 38-truck regional dry van carrier serving the Southeast. Founded 2003. Drivers stay an average of 6.4 years.",
    distanceMi: 112,
    lat: 35.0456, lng: -85.3097,
  },
  {
    id: "ironpine",
    name: "Ironpine Logistics",
    logo: logo("I", "#1f2937"),
    headline: "Mid-size reefer fleet. Premium pay for tenured drivers.",
    hq: "Atlanta, GA",
    fleet: 92,
    dot: "DOT 1894211",
    mc: "MC 681142",
    payRange: "$0.70 – $0.82 / mi",
    payMin: 0.70, payMax: 0.82,
    homeTime: "Home every 10–14 days",
    homeTimePolicy: "biweekly",
    benefits: ["Health", "Dental", "401k", "Per diem"],
    lanes: ["SE → Midwest", "TX ↔ GA", "FL produce"],
    equipment: ["Reefer"],
    requiredEndorsements: [],
    experienceRange: [3, 30],
    terminals: ["Atlanta, GA"],
    fmcsa: { safety: "Satisfactory", authority: "Active", inspections24mo: 318, oosRate: "2.1%" },
    about:
      "Reefer specialist hauling produce, pharma, and grocery freight. Newer Freightliner Cascadias, APUs standard.",
    distanceMi: 198,
    lat: 33.7490, lng: -84.3880,
  },
  {
    id: "blueforge",
    name: "Blue Forge Freight",
    logo: logo("B", "#1e3a8a"),
    headline: "Asset-based dry van. Dedicated lanes available.",
    hq: "Nashville, TN",
    fleet: 54,
    dot: "DOT 3148021",
    mc: "MC 901334",
    payRange: "$0.68 – $0.74 / mi",
    payMin: 0.68, payMax: 0.74,
    homeTime: "Home weekly",
    homeTimePolicy: "weekly",
    benefits: ["Health", "401k", "PTO"],
    lanes: ["TN ↔ OH", "TN ↔ IL", "Midwest"],
    equipment: ["Dry van"],
    requiredEndorsements: [],
    experienceRange: [1, 30],
    terminals: ["Nashville, TN"],
    fmcsa: { safety: "Satisfactory", authority: "Active", inspections24mo: 201, oosRate: "1.8%" },
    about: "Asset-based carrier focused on dedicated retail lanes for Tier 1 shippers.",
    distanceMi: 178,
    lat: 36.1627, lng: -86.7816,
  },
  {
    id: "summit",
    name: "Summit Haul Co.",
    logo: logo("S", "#365314"),
    headline: "Flatbed specialist. Higher pay, longer days.",
    hq: "Birmingham, AL",
    fleet: 27,
    dot: "DOT 2891142",
    mc: "MC 754209",
    payRange: "$0.74 – $0.86 / mi",
    payMin: 0.74, payMax: 0.86,
    homeTime: "Home bi-weekly",
    homeTimePolicy: "biweekly",
    benefits: ["Health", "401k", "Tarp pay"],
    lanes: ["SE → TX", "SE → Midwest"],
    equipment: ["Flatbed", "Step deck"],
    requiredEndorsements: [],
    experienceRange: [2, 30],
    terminals: ["Birmingham, AL"],
    fmcsa: { safety: "Satisfactory", authority: "Active", inspections24mo: 96, oosRate: "2.4%" },
    about: "Flatbed/step-deck steel and building materials. Tarp pay $50 per load.",
    distanceMi: 234,
    lat: 33.5186, lng: -86.8104,
  },
  {
    id: "northstar",
    name: "Northstar Transport",
    logo: logo("N", "#0c4a6e"),
    headline: "OTR dry van. 48 state operation.",
    hq: "Louisville, KY",
    fleet: 168,
    dot: "DOT 1108342",
    mc: "MC 482910",
    payRange: "$0.62 – $0.71 / mi",
    payMin: 0.62, payMax: 0.71,
    homeTime: "Home every 14 days",
    homeTimePolicy: "OTR",
    benefits: ["Health", "Dental", "Vision", "401k", "$5k sign-on"],
    lanes: ["48 states OTR", "Northeast"],
    equipment: ["Dry van"],
    requiredEndorsements: [],
    experienceRange: [1, 30],
    terminals: ["Louisville, KY", "Indianapolis, IN"],
    fmcsa: { safety: "Satisfactory", authority: "Active", inspections24mo: 612, oosRate: "2.7%" },
    about: "Established OTR carrier. Newer trucks, in-cab tech, dedicated driver manager.",
    distanceMi: 290,
    lat: 38.2527, lng: -85.7585,
  },
  {
    id: "cedarline",
    name: "Cedarline Express",
    logo: logo("C", "#7c2d12"),
    headline: "Regional carrier. Steady freight, weekly settlements.",
    hq: "Memphis, TN",
    fleet: 44,
    dot: "DOT 2784109",
    mc: "MC 691827",
    payRange: "$0.65 – $0.72 / mi",
    payMin: 0.65, payMax: 0.72,
    homeTime: "Home weekly",
    homeTimePolicy: "weekly",
    benefits: ["Health", "PTO"],
    lanes: ["TN ↔ AR", "TN ↔ MS", "SE regional"],
    equipment: ["Dry van"],
    requiredEndorsements: [],
    experienceRange: [1, 30],
    terminals: ["Memphis, TN"],
    fmcsa: { safety: "Satisfactory", authority: "Active", inspections24mo: 158, oosRate: "1.9%" },
    about: "Regional dry van carrier. Drivers report a no-touch freight policy and consistent miles.",
    distanceMi: 386,
    lat: 35.1495, lng: -90.0490,
  },
];

export const marketSnapshot = {
  nationalRate: 2.41,
  yourLaneRate: 2.68,
  weekChange: +0.06,
  fuelIndex: 3.84,
  fuelTrend: [3.71, 3.74, 3.78, 3.81, 3.79, 3.82, 3.84],
};

export const hotLanes = [
  { lane: "Atlanta → Dallas", rate: 2.71, change: +0.08 },
  { lane: "Memphis → Chicago", rate: 2.55, change: +0.04 },
  { lane: "Knoxville → Miami", rate: 2.84, change: -0.02 },
  { lane: "Nashville → Houston", rate: 2.62, change: +0.05 },
];

export const activity = [
  { id: 1, kind: "viewed", text: "You viewed Ridgeline Carriers", when: "2h ago" },
  { id: 2, kind: "saved", text: "Saved Ironpine Logistics", when: "Yesterday" },
  { id: 3, kind: "applied", text: "Applied to Blue Forge Freight", when: "3 days ago" },
  { id: 4, kind: "match", text: "New match: Summit Haul Co.", when: "5 days ago" },
];

export const noctiPrompts = [
  "What's the avg rate to Dallas this week?",
  "Compare Ridgeline and Ironpine for me",
  "Explain the 70-hour rule",
  "Best companies for home-weekly out of Knoxville?",
];

export const cannedReplies: Record<string, string> = {
  default:
    "I can help with that. Right now I'm running on mock data, but soon I'll pull live market rates, FMCSA records, and your matched companies in real time.",
  rate:
    "Atlanta → Dallas is averaging **$2.71/mi** this week, up **$0.08** from last week. Your lane average ($2.68) is running 11% above the national average.",
  compare:
    "**Ridgeline** vs **Ironpine** — Ridgeline pays slightly less ($0.72–0.78) but gets you home weekly. Ironpine pays more ($0.70–0.82) but you're out 10–14 days. Based on your preferences, Ridgeline is a stronger fit.",
  hours:
    "The 70-hour rule limits you to 70 hours of on-duty time over any rolling 8-day period. A 34-hour reset restarts the clock. Property-carrying drivers only.",
};
