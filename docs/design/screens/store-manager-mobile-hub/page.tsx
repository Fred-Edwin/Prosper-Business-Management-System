// Screen skeleton transcribed from the Paper artboard "Store Manager Mobile Hub" (8T3-0)
// via get_jsx (Tailwind format). Structure and classes are left as Paper emitted them;
// only literal data was lifted into ./fixtures.ts. The Paper artboard frame, the mobile
// status-bar node, the staff-shell header and the bottom nav are dropped — this file is
// the hub *content* that renders inside the staff shell (see app/store-manager/page.tsx).
//
// NO kit swap — same call as Session 4b's admin-stock-mobile. All three sections diverge
// structurally from their kit components, so they are transcribed inline verbatim:
//   • The two banners: Paper draws a leading 16×16 warning/info icon in a
//     `justify-start gap-(--sp-3)` row; the kit <Banner> has no icon slot and a
//     `justify-between` header. Also the 2nd ("Purchase Delivery") banner box is amber
//     (`bg-warning-bg border-warning`) on this artboard with only the heading/icon in
//     `--color-info` — NOT the blue `bg-info-bg border-info` box the kit
//     <PurchaseDeliveryBanner> renders. Transcribed as drawn; flagged for a Dev Sprint.
//   • Quick Operations: Paper uses `flex-wrap basis-[calc(50%-8px)]` cards, `min-w-[150px]`,
//     `--surface-subtle` bg, `border-strong`, icon top-RIGHT, `text-h2/h2` title. The kit
//     <ActionTileGrid> is a fixed `w-[300px]` grid of `w-[142px]` tiles, `border-subtle`,
//     icon on TOP, `text-sm/sm` title. Different component — transcribed inline.
//   • Movement Log: Paper rows are `justify-between py-(--sp-4) px-(--sp-6) border-t`, value
//     `font-mono font-(--weight-medium) text-body/sm`. The kit <ActivityTimeline> is
//     `w-[340px]`, `py-(--sp-5)`, `border-b`, value `font-(--weight-semibold) text-sm/micro`.
//     Transcribed inline.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
import * as React from "react";
import {
  hubBanners,
  hubMovementLog,
  hubMovementLogHeading,
  hubQuickOps,
  hubQuickOpsHeading,
  type HubQuickOpTile,
} from "./fixtures";

const TILE_STROKE: Record<HubQuickOpTile["tone"], string> = {
  accent: "var(--color-accent)",
  danger: "var(--color-danger)",
  success: "var(--color-success)",
  info: "var(--color-info)",
};

const TILE_LABEL_CLASS: Record<HubQuickOpTile["tone"], string> = {
  accent: "font-(--weight-medium) text-accent",
  danger: "[color:var(--text-tertiary)]",
  success: "font-(--weight-medium) text-success",
  info: "[color:var(--text-tertiary)]",
};

function TileIcon({ iconKey, tone }: { iconKey: HubQuickOpTile["iconKey"]; tone: HubQuickOpTile["tone"] }) {
  const stroke = TILE_STROKE[tone];
  switch (iconKey) {
    case "receive":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="none" stroke={stroke} strokeWidth="1.5" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="12" y1="22.08" x2="12" y2="12" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "issue":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <line x1="7" y1="17" x2="17" y2="7" stroke={stroke} strokeWidth="1.5" />
          <polyline points="7 7 17 7 17 17" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "production":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="9" cy="7" r="4" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "transfer":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <polyline points="17 1 21 5 17 9" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke={stroke} strokeWidth="1.5" />
          <polyline points="7 23 3 19 7 15" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
  }
}

function BannerIcon({ tone }: { tone: "warning" | "info" }) {
  const stroke = tone === "warning" ? "var(--color-warning)" : "var(--color-info)";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px" }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke={stroke} strokeWidth="1.5" />
      <line x1="12" y1="9" x2="12" y2="13" stroke={stroke} strokeWidth="1.5" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

export default function StoreManagerMobileHubScreen() {
  return (
    <div className="[font-synthesis:none] flex flex-col grow min-h-[0px] overflow-clip gap-(--sp-6) antialiased text-caption/micro">
      {/* Persistent hub banners */}
      {hubBanners.map((banner) => (
        <div
          key={banner.title}
          className="flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) bg-warning-bg border border-solid border-warning"
        >
          <div className="flex items-center justify-start gap-(--sp-3)">
            <BannerIcon tone={banner.tone} />
            <div className="flex flex-col gap-[2px]">
              <div
                className={`font-ui font-(--weight-semibold) text-sm/sm ${
                  banner.tone === "warning" ? "text-warning" : "text-info"
                }`}
              >
                {banner.title}
              </div>
              <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
                {banner.detail}
              </div>
            </div>
          </div>
          <div
            className={`flex items-center gap-(--sp-4) ${
              banner.tone === "info" ? "bg-info-bg" : ""
            }`}
          >
            <div
              className={`flex items-center justify-center h-[36px] grow rounded-sm ${
                banner.tone === "warning" ? "bg-success" : "bg-info"
              }`}
            >
              <div className="font-ui font-(--weight-semibold) text-white text-sm/sm">
                {banner.primaryLabel}
              </div>
            </div>
            <div className="flex items-center justify-center h-[36px] px-(--sp-6) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
              <div className="font-ui font-(--weight-medium) w-max shrink-0 [color:var(--text-primary)] text-sm/sm">
                {banner.flagLabel}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Quick Operations */}
      <div className="flex flex-col [width:100%] px-(--sp-6) gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) tracking-[0.03em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
          {hubQuickOpsHeading}
        </div>
        <div className="flex flex-wrap [width:100%] gap-(--sp-4)">
          {hubQuickOps.map((tile) => (
            <div
              key={tile.title}
              className="flex flex-col min-w-[150px] p-(--sp-5) rounded-md gap-(--sp-5) basis-[calc(50%-8px)] [background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-strong)]"
            >
              <div className="flex items-start justify-between [width:100%]">
                <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
                  {tile.title}
                </div>
                <TileIcon iconKey={tile.iconKey} tone={tile.tone} />
              </div>
              <div className={`font-ui inline-block text-sm/micro ${TILE_LABEL_CLASS[tile.tone]}`}>
                {tile.subLabel}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Movement Log */}
      <div className="flex flex-col [width:100%]">
        <div className="font-ui font-(--weight-semibold) inline-block pb-(--sp-4) px-(--sp-6)">
          <div className="inline-block font-ui font-(--weight-semibold) tracking-[0.03em] uppercase [color:var(--text-tertiary)] text-caption/micro">
            {hubMovementLogHeading}
          </div>
        </div>
        {hubMovementLog.map((row) => (
          <div
            key={row.title}
            className="flex items-center justify-between [width:100%] py-(--sp-4) px-(--sp-6) border-t border-t-solid [border-top-color:var(--border-subtle)]"
          >
            <div className="flex flex-col gap-[2px]">
              <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-body/sm">
                {row.title}
              </div>
              <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
                {row.subtitle}
              </div>
            </div>
            <div
              className={`font-mono font-(--weight-medium) inline-block w-max shrink-0 text-body/sm ${
                row.sign === "negative" ? "text-danger" : "text-success"
              }`}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
