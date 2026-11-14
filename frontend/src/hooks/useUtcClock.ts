import { useEffect, useState } from 'react';

/** Current wall-clock time, ticking every second. Display only; scientific time lives in the store. */
export function useUtcClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
