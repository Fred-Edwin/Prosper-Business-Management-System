/** One sealed business date. `date` is `YYYY-MM-DD` (Africa/Nairobi). */
export type DayCloseView = {
  date: string;
  closedBy: string;
  closedAt: string;
};

/** Status of a single business date for the Admin card / status check. */
export type DayStatusView = {
  date: string;
  closed: boolean;
  closedBy: string | null;
  closedAt: string | null;
};
