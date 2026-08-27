// Screen-state skeleton transcribed from the Paper artboard "Asset Drawer — Create / Edit" (8JO-0)
// via get_jsx (Tailwind format). This is the drawer *body* the real Assets screen will mount
// conditionally in Phase C. The Paper artboard frame (40px page padding + white page) is dropped;
// the panel is kept verbatim (w-[380px], h-fit, header / body / footer regions). Footer buttons
// are swapped for the kit <Button>; every other span is verbatim from get_jsx.
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import {
  assetDrawerCancelLabel,
  assetDrawerCategory,
  assetDrawerConditionActive,
  assetDrawerConditionOptions,
  assetDrawerConfirmLabel,
  assetDrawerCostBasis,
  assetDrawerLocation,
  assetDrawerName,
  assetDrawerNotes,
  assetDrawerPurchaseDate,
  assetDrawerTitle,
} from "./fixtures";

export default function AssetDrawerScreen() {
  return (
    <div className="flex flex-col w-[380px] h-fit rounded-md bg-(--surface-panel-tint) border border-solid [border-color:var(--border-subtle)] [font-synthesis:none] antialiased text-caption/micro">
      {/* Header */}
      <div className="flex items-center justify-between h-[52px] shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
          {assetDrawerTitle}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <line x1="18" y1="6" x2="6" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Body */}
      <div className="flex flex-col grow p-(--sp-8) gap-(--sp-6)">
        {/* Asset name */}
        <div className="flex flex-col gap-[6px]">
          <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
            Asset name
          </div>
          <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui [color:var(--text-primary)] text-sm/sm">{assetDrawerName}</div>
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col w-[331px] gap-[6px]">
          <div className="flex items-center justify-between w-[331px]">
            <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
              Category *
            </div>
            <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-accent text-caption/micro">
              + Add Category
            </div>
          </div>
          <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">{assetDrawerCategory}</div>
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" fill="none" stroke="var(--text-secondary)" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-[6px]">
          <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
            Location
          </div>
          <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui [color:var(--text-primary)] text-sm/sm">{assetDrawerLocation}</div>
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Condition */}
        <div className="flex flex-col gap-[6px]">
          <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
            Condition
          </div>
          <div className="flex items-center h-[36px] p-[2px] rounded-sm gap-[2px] shrink-0 [background-color:var(--surface-subtle)]">
            {assetDrawerConditionOptions.map((cond) => {
              const isActive = cond === assetDrawerConditionActive;
              return (
                <div
                  key={cond}
                  className={`flex items-center justify-center h-[32px] grow rounded-[2px] ${
                    isActive ? "[box-shadow:#00000014_0px_1px_2px] bg-(--surface-page)" : ""
                  }`}
                >
                  <div
                    className={`font-ui text-sm/sm ${
                      isActive ? "font-(--weight-medium) text-success" : "[color:var(--text-secondary)]"
                    }`}
                  >
                    {cond}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase Date + Cost Basis */}
        <div className="flex items-start w-[331px] gap-(--sp-5)">
          <div className="flex flex-col grow min-w-[0px] gap-[6px]">
            <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
              Purchase Date
            </div>
            <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
              <div className="font-mono inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
                {assetDrawerPurchaseDate}
              </div>
            </div>
          </div>
          <div className="flex flex-col grow min-w-[0px] gap-[6px]">
            <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
              Cost Basis (KES) *
            </div>
            <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
              <div className="font-mono inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
                {assetDrawerCostBasis}
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance & Usage Notes */}
        <div className="flex flex-col w-[331px] gap-[6px]">
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
            Maintenance &amp; Usage Notes
          </div>
          <div className="flex min-h-[64px] p-(--sp-5) rounded-sm border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui inline-block [color:var(--text-primary)] text-body/body">{assetDrawerNotes}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end shrink-0 p-(--sp-8) gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button variant="secondary">{assetDrawerCancelLabel}</Button>
        <Button variant="primary">{assetDrawerConfirmLabel}</Button>
      </div>
    </div>
  );
}
