import * as React from "react";
import { currentDriver, type Driver } from "@/data/mock";
import { adaptApiDriverToDriver, getDriver } from "@/lib/api";

type Ctx = { driver: Driver; setDriver: (d: Driver) => void };
const DriverCtx = React.createContext<Ctx | null>(null);
const STORAGE_KEY = "nocti-driver";
const SESSION_KEY = "nocti_current_driver";

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriverState] = React.useState<Driver>(currentDriver);

  // hydrate from localStorage after mount (avoid SSR mismatch)
  React.useEffect(() => {
    // 1. If a real driver session exists, fetch fresh data from the API and
    //    use that instead of the demo Markus Reed mock.
    try {
      const sessRaw = localStorage.getItem(SESSION_KEY);
      if (sessRaw) {
        const sess = JSON.parse(sessRaw) as { driver_id?: number | string };
        if (sess?.driver_id != null) {
          getDriver(sess.driver_id)
            .then((api) => setDriverState(adaptApiDriverToDriver(api)))
            .catch(() => {});
          return;
        }
      }
    } catch {}
    // 2. Otherwise fall back to any locally edited demo driver.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDriverState({ ...currentDriver, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const setDriver = React.useCallback((d: Driver) => {
    setDriverState(d);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
  }, []);

  return <DriverCtx.Provider value={{ driver, setDriver }}>{children}</DriverCtx.Provider>;
}

export function useDriver() {
  const ctx = React.useContext(DriverCtx);
  if (!ctx) throw new Error("useDriver must be inside DriverProvider");
  return ctx;
}
