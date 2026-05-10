import { describe, expect, it } from "vitest";
import { computeMatch } from "./match";
import type { Company, Driver } from "@/data/mock";

const baseDriver: Driver = {
  id: "d1",
  firstName: "Test",
  lastName: "Driver",
  phone: "",
  yearsExp: 5,
  homeBase: "Knoxville, TN",
  status: "Looking",
  photo: "",
  about: "",
  endorsements: ["CDL-A"],
  experience: [],
  preferences: {
    payPerMile: "0.60 – 0.75",
    homeTime: "Home weekly",
    preferredLanes: ["SE regional", "TN ↔ TX"],
    avoidLanes: ["Northeast"],
    equipment: ["Dry van"],
  },
  desiredHomeTime: "weekly",
  desiredPayMin: 0.6,
  desiredPayMax: 0.75,
  benefitsWanted: ["Health insurance", "401k match"],
  documents: [],
};

const baseCompany: Company = {
  id: "c1",
  name: "Test Co",
  logo: "",
  headline: "",
  hq: "Chattanooga, TN",
  fleet: 30,
  dot: "",
  mc: "",
  payRange: "$0.65 – $0.75 / mi",
  payMin: 0.65,
  payMax: 0.75,
  homeTime: "Home weekly",
  homeTimePolicy: "weekly",
  benefits: ["Health insurance", "401k match"],
  lanes: ["SE regional", "TN ↔ TX"],
  equipment: ["Dry van"],
  requiredEndorsements: [],
  experienceRange: [2, 20],
  terminals: [],
  fmcsa: { safety: "Satisfactory", authority: "Active", inspections24mo: 100, oosRate: "1%" },
  about: "",
  distanceMi: 80,
  lat: 35, lng: -85,
};

const driver = (over: Partial<Driver> = {}): Driver => ({
  ...baseDriver,
  ...over,
  preferences: { ...baseDriver.preferences, ...(over.preferences ?? {}) },
});
const company = (over: Partial<Company> = {}): Company => ({ ...baseCompany, ...over });

describe("computeMatch — lane penalties", () => {
  it("flags hard disqualifier and subtracts 15 when company runs an avoided lane", () => {
    const c = company({ lanes: ["SE regional", "Northeast"] });
    const baseline = computeMatch(driver({ preferences: { ...baseDriver.preferences, avoidLanes: [] } }), c);
    const penalized = computeMatch(driver(), c);

    expect(penalized.hard_disqualifiers.some((s) => /northeast/i.test(s))).toBe(true);
    expect(penalized.match_score).toBe(Math.max(0, baseline.match_score - 15));
  });

  it("scores 100 lane overlap when preferred lanes exactly match company lanes", () => {
    const r = computeMatch(driver(), company());
    expect(r.factors.lane_overlap.score).toBe(100);
  });

  it("scores 0 lane overlap when there's no intersection", () => {
    const r = computeMatch(driver(), company({ lanes: ["West coast"] }));
    expect(r.factors.lane_overlap.score).toBe(0);
  });

  it("does not penalize when the avoided lane isn't in the company's lanes", () => {
    const r = computeMatch(driver(), company());
    expect(r.hard_disqualifiers).toHaveLength(0);
  });
});

describe("computeMatch — pay edge cases", () => {
  it("scores 0 when the company's top end is below the driver's floor", () => {
    const r = computeMatch(driver(), company({ payMin: 0.4, payMax: 0.5 }));
    expect(r.factors.pay_alignment.score).toBe(0);
    expect(r.factors.pay_alignment.detail).toMatch(/below your floor/i);
  });

  it("scores 100 when the company range fully covers the driver's range", () => {
    const r = computeMatch(driver(), company({ payMin: 0.6, payMax: 0.9 }));
    expect(r.factors.pay_alignment.score).toBe(100);
  });

  it("partial overlap returns a fractional score", () => {
    // driver wants 0.60–0.75; company offers 0.70–0.73 → 0.03 / 0.15 = 20%
    const r = computeMatch(driver(), company({ payMin: 0.7, payMax: 0.73 }));
    expect(r.factors.pay_alignment.score).toBeGreaterThan(0);
    expect(r.factors.pay_alignment.score).toBeLessThan(100);
  });

  it("adds a top-end bonus when company pay beats driver target by 10%+", () => {
    // driver max 0.75; company max 0.90 → 20% over
    const r = computeMatch(driver(), company({ payMin: 0.6, payMax: 0.9 }));
    expect(r.factors.pay_alignment.detail).toMatch(/beats your target/i);
  });
});

describe("computeMatch — endorsement disqualifiers", () => {
  it("zeroes equipment score and adds a hard disqualifier when required endorsement is missing", () => {
    const r = computeMatch(driver(), company({ requiredEndorsements: ["Hazmat"] }));
    expect(r.factors.equipment.score).toBe(0);
    expect(r.factors.equipment.detail).toMatch(/missing required endorsement/i);
    expect(r.hard_disqualifiers.some((s) => /hazmat/i.test(s))).toBe(true);
  });

  it("computes equipment fit normally when the driver holds every required endorsement", () => {
    const d = driver({ endorsements: ["CDL-A", "Hazmat"] });
    const r = computeMatch(d, company({ requiredEndorsements: ["Hazmat"] }));
    expect(r.factors.equipment.score).toBe(100);
    expect(r.hard_disqualifiers).toHaveLength(0);
  });

  it("clamps the final match_score to the 0–100 range even with multiple disqualifiers", () => {
    const c = company({
      lanes: ["Northeast"],
      payMin: 0.2,
      payMax: 0.3,
      requiredEndorsements: ["Hazmat"],
      benefits: [],
      equipment: ["Reefer"],
      distanceMi: 900,
      experienceRange: [10, 30],
    });
    const r = computeMatch(driver(), c);
    expect(r.match_score).toBeGreaterThanOrEqual(0);
    expect(r.match_score).toBeLessThanOrEqual(100);
  });
});