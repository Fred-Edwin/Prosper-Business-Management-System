// Screen skeleton transcribed from the Paper artboard "Canteen Mobile Operations Hub"
// (9BA-0) via get_jsx (Tailwind format). This is the hub *content* that renders inside the
// staff shell — the mobile status-bar, staff-shell header and bottom nav are dropped (see
// app/canteen/page.tsx). Classes left as Paper emitted them; only literal data lifted into
// ./fixtures.ts.
//
// NO kit swap — same call as the Store Manager hub / 4b admin-stock-mobile:
//   • The banner draws a leading 16×16 warning icon in a `justify-start gap-(--sp-3)` row;
//     the kit <Banner> has no icon slot and a `justify-between` header. Transcribed inline;
//     flagged for a Dev Sprint.
//   • "Canteen Workflows" is a bespoke ROW list (icon box + text + trailing chevron), NOT
//     the kit <ActionTileGrid> (a 2-up tile grid). Kept verbatim.
//   • Movement log rows are `justify-between py-(--sp-4) px-(--sp-6) border-t` with a
//     `font-mono` time on the right — not the kit <ActivityTimeline> (`w-[340px]`,
//     `py-(--sp-5)`, `border-b`, signed-value on the right). Transcribed inline.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
import * as React from "react";
import {
  canteenHubBanner,
  canteenLog,
  canteenLogHeading,
  canteenWorkflows,
  canteenWorkflowsHeading,
  type CanteenWorkflowRow,
} from "./fixtures";

function WorkflowIcon({ iconKey }: { iconKey: CanteenWorkflowRow["iconKey"] }) {
  switch (iconKey) {
    case "stockCount":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <rect x="9" y="2" width="6" height="4" rx="1" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
          <path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
        </svg>
      );
    case "transfer":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <polyline points="17 1 21 5 17 9" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
          <polyline points="7 23 3 19 7 15" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
        </svg>
      );
  }
}

function RightChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
    </svg>
  );
}

export default function CanteenMobileOperationsHubScreen() {
  return (
    <div className="[font-synthesis:none] flex flex-col grow min-h-[0px] overflow-clip gap-(--sp-6) antialiased text-caption/micro">
      {/* Incoming stock banner */}
      <div className="flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) bg-warning-bg border border-solid border-warning">
        <div className="flex items-center justify-start gap-(--sp-3)">
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px" }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" />
            <line x1="12" y1="9" x2="12" y2="13" stroke="var(--color-warning)" strokeWidth="1.5" />
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="var(--color-warning)" strokeWidth="1.5" />
          </svg>
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) text-warning text-sm/sm">
              {canteenHubBanner.title}
            </div>
            <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
              {canteenHubBanner.detail}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-(--sp-4)">
          <div className="flex items-center justify-center h-[36px] grow rounded-sm bg-success">
            <div className="font-ui font-(--weight-semibold) text-white text-sm/sm">
              {canteenHubBanner.primaryLabel}
            </div>
          </div>
          <div className="flex items-center justify-center h-[36px] px-(--sp-6) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui font-(--weight-medium) w-max shrink-0 [color:var(--text-primary)] text-sm/sm">
              {canteenHubBanner.flagLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Canteen Workflows */}
      <div className="flex flex-col [width:100%] px-(--sp-6) gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) tracking-[0.03em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
          {canteenWorkflowsHeading}
        </div>
        {canteenWorkflows.map((row) => (
          <div
            key={row.title}
            className={`flex items-center p-(--sp-5) rounded-md gap-(--sp-5) border border-solid ${
              row.active
                ? "bg-(--surface-selected) border-accent"
                : "[border-color:var(--border-subtle)]"
            }`}
          >
            <div
              className={`flex items-center justify-center w-[40px] h-[40px] shrink-0 rounded-sm ${
                row.active ? "bg-(--surface-page)" : "[background-color:var(--surface-subtle)]"
              }`}
            >
              <WorkflowIcon iconKey={row.iconKey} />
            </div>
            {row.subLabel ? (
              <div className="flex flex-col grow gap-[2px]">
                <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
                  {row.title}
                </div>
                <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
                  {row.subLabel}
                </div>
              </div>
            ) : (
              <div className="font-ui font-(--weight-semibold) grow inline-block [color:var(--text-primary)] text-h2/h2">
                {row.title}
              </div>
            )}
            <RightChevron />
          </div>
        ))}
      </div>

      {/* Today's Canteen Log */}
      <div className="flex flex-col [width:100%]">
        <div className="font-ui font-(--weight-semibold) inline-block pb-(--sp-4) px-(--sp-6)">
          <div className="inline-block font-ui font-(--weight-semibold) tracking-[0.03em] uppercase [color:var(--text-tertiary)] text-caption/micro">
            {canteenLogHeading}
          </div>
        </div>
        {canteenLog.map((row) => (
          <div
            key={row.text}
            className="flex items-center justify-between [width:100%] py-(--sp-4) px-(--sp-6) border-t border-t-solid [border-top-color:var(--border-subtle)]"
          >
            <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">
              {row.text}
            </div>
            <div className="font-mono inline-block w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
              {row.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
