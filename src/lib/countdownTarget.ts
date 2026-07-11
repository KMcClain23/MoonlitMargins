// The exact moment applications reopen. No timezone offset on purpose --
// a date-time string without one is interpreted as local time by the
// visitor's own browser, so "midnight" means midnight wherever they are,
// matching how people actually think about "New Year's Day."
export const APPLICATIONS_REOPEN_AT = "2027-01-01T00:00:00";
