// Screen-state skeleton transcribed from the Paper artboard "Product Drawer — Create / Edit" (796-0)
// via get_jsx (Tailwind format). This is the drawer *body* the real Catalog screen will mount
// conditionally in Phase C. The Paper artboard frame (the 40px page padding + white page) is
// dropped; the panel is kept verbatim (w-[480px], h-fit, header / body / footer regions).
// Footer buttons are swapped for the kit <Button>; every other span is verbatim from get_jsx.
// FLAG (raw literal, kept verbatim per the transcription rule): the active "Product kind"
// segment label emits text-[oklch(28.4%_0.126_296.2)] rather than text-accent — noted in PROGRESS.
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import {
  productDrawerBuyingPriceValue,
  productDrawerCancelLabel,
  productDrawerConfirmLabel,
  productDrawerDishNote,
  productDrawerKindActive,
  productDrawerKindOptions,
  productDrawerLocationRows,
  productDrawerNamePlaceholder,
  productDrawerTitle,
  productDrawerUnitPlaceholder,
} from "./fixtures";

export default function ProductDrawerScreen() {
  return (
    <div className="flex flex-col w-[480px] h-fit rounded-md bg-(--surface-panel-tint) border border-solid [border-color:var(--border-subtle)] [font-synthesis:none] antialiased">
      {/* Header */}
      <div className="flex items-center justify-between h-[52px] shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
          {productDrawerTitle}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <line x1="18" y1="6" x2="6" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Body */}
      <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) overflow-clip">
        {/* General Information */}
        <div className="flex flex-col gap-(--sp-6)">
          <div className="font-ui font-(--weight-semibold) uppercase tracking-[0.06em] [color:var(--text-tertiary)] text-caption/micro">
            General Information
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Product Name
            </div>
            <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
              <div className="font-ui [color:var(--text-tertiary)] text-sm/micro">
                {productDrawerNamePlaceholder}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Product kind
            </div>
            <div className="flex items-center h-[36px] p-[2px] rounded-sm gap-[2px] shrink-0 [background-color:var(--surface-subtle)]">
              {productDrawerKindOptions.map((kind) => {
                const isActive = kind === productDrawerKindActive;
                return (
                  <div
                    key={kind}
                    className={`flex items-center justify-center h-[32px] px-(--sp-5) rounded-[2px] ${
                      isActive ? "[box-shadow:#00000014_0px_1px_2px] bg-(--surface-page)" : ""
                    }`}
                  >
                    <div
                      className={`font-ui text-sm/sm ${
                        isActive
                          ? "font-(--weight-medium) text-[oklch(28.4%_0.126_296.2)]"
                          : "font-(--weight-regular) [color:var(--text-secondary)]"
                      }`}
                    >
                      {kind}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Unit Label
            </div>
            <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
              <div className="font-ui [color:var(--text-tertiary)] text-sm/micro">
                {productDrawerUnitPlaceholder}
              </div>
            </div>
          </div>
        </div>

        {/* Cost & Buying Price */}
        <div className="flex flex-col pt-(--sp-6) gap-(--sp-6) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-semibold) uppercase tracking-[0.06em] [color:var(--text-tertiary)] text-caption/micro">
            Cost &amp; Buying Price
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-secondary)] text-caption/micro">
              Buying Price
            </div>
            <div className="flex items-center h-[36px] rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
              <div className="flex items-center justify-center h-[36px] shrink-0 px-(--sp-5) [background-color:var(--surface-subtle)] border-r border-r-solid [border-right-color:var(--border-subtle)]">
                <div className="font-mono w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                  KES
                </div>
              </div>
              <div className="font-mono pl-(--sp-5)">
                <div className="font-mono [color:var(--text-primary)] text-sm/micro">
                  {productDrawerBuyingPriceValue}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-info-bg">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
              <line x1="12" y1="16" x2="12" y2="12" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="8" x2="12.01" y2="8" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="font-ui text-info text-sm/sm">{productDrawerDishNote}</div>
          </div>
        </div>

        {/* Location Availability & Selling Prices */}
        <div className="flex flex-col pt-(--sp-6) gap-(--sp-6) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <div className="font-ui font-(--weight-semibold) uppercase tracking-[0.06em] [color:var(--text-tertiary)] text-caption/micro">
            Location Availability &amp; Selling Prices
          </div>
          {productDrawerLocationRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center p-(--sp-5) rounded-sm gap-(--sp-5) border border-solid [border-color:var(--border-subtle)]"
            >
              {row.enabled ? (
                <div className="flex items-center w-[40px] h-[22px] shrink-0 p-[2px] rounded-[11px] bg-accent">
                  <div className="w-[18px] h-[18px] ml-auto rounded-[50%] shrink-0 bg-white" />
                </div>
              ) : (
                <div className="flex items-center w-[40px] h-[22px] shrink-0 p-[2px] rounded-[11px] bg-gray-300">
                  <div className="w-[18px] h-[18px] rounded-[50%] shrink-0 bg-white" />
                </div>
              )}
              <div className="font-ui font-(--weight-medium) shrink-0 w-[90px] [color:var(--text-primary)] text-sm/micro">
                {row.label}
              </div>
              {row.enabled ? (
                <>
                  <div className="flex items-center h-[32px] w-[100px] shrink-0 rounded-sm border border-solid [border-color:var(--border-strong)]">
                    <div className="flex items-center justify-center h-[32px] shrink-0 px-[6px] border-r border-r-solid [border-right-color:var(--border-subtle)]">
                      <div className="font-mono w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
                        KES
                      </div>
                    </div>
                    <div className="font-mono pl-[6px]">
                      <div className="font-mono [color:var(--text-primary)] text-sm/micro">
                        {row.sellingPrice}
                      </div>
                    </div>
                  </div>
                  <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">Selling price</div>
                </>
              ) : (
                <div className="font-ui [color:var(--text-tertiary)] text-sm/micro">{row.disabledNote}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end shrink-0 p-(--sp-8) gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button variant="secondary">{productDrawerCancelLabel}</Button>
        <Button variant="primary">{productDrawerConfirmLabel}</Button>
      </div>
    </div>
  );
}
