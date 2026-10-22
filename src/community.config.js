// Public connection details for the community layer. The publishable key is
// safe to ship: it grants only what Row Level Security allows (read the
// ratings table, call the rate-limited vote RPC). Rotate it from the Supabase
// dashboard if ever needed; nothing else in the app depends on it.
export const COMMUNITY = {
  url: "https://ivucfpduvaiyxjcqbsqa.supabase.co",
  key: "sb_publishable_l8oekCrp1RalXOZBZjtTNQ_LmR6x-8D",
};
