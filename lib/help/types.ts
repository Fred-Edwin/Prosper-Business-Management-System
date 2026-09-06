// In-app help content model. One HelpTopic per Admin screen (and, for the
// tabbed screens, per tab). Content is authored in plain language for the
// business owner — NOT copied from the design/flow docs, which are written
// for agents. Source of truth for the wording is the screen's own behaviour
// (read the screen, describe what it does).
//
// Rendered by components/help/help-panel.tsx inside the kit <Drawer>.

export interface HelpStep {
  /** Short imperative title — becomes the InstructionalBanner heading. */
  title: string;
  /** One or two plain sentences. */
  body: string;
}

export interface HelpSection {
  /** What this screen (or tab) is for — 1–3 sentences, no jargon. */
  whatItIs: string;
  /** The main things you do here, in order. Omit for read-only screens. */
  steps?: HelpStep[];
  /** Rules worth knowing — money/ledger behaviour, who can do what. */
  goodToKnow?: string[];
}

export interface HelpTopic extends HelpSection {
  /** Section root path, e.g. "/admin/financials". No query string. */
  route: string;
  /** Panel title. */
  title: string;
  /**
   * Per-tab overrides for screens with an inner tab row. Keyed by the `?tab=`
   * value; the key `""` (or a missing entry) uses the top-level section.
   * A tab entry may set only `steps` / `goodToKnow` and inherit `whatItIs`.
   */
  tabs?: Record<string, Partial<HelpSection> & { title?: string }>;
  /** Jump to related screens. */
  seeAlso?: { label: string; route: string }[];
}
