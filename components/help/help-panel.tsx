// The screen-help slide-over. Composed from the frozen kit — the rail <Drawer>
// for the panel shell, <InstructionalBanner> for each step — plus plain
// bordered/typographic blocks in this file for the "what it is", "good to
// know" and "see also" sections (the kit has no card for running help text).
//
// Content comes from lib/help keyed off the current pathname + ?tab=. If there
// is no topic for the route, the panel renders nothing and the shell hides its
// "?" button (see HelpButton wiring in the shell clients).
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Drawer } from "@/components/kit/drawer";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { helpTopicForPath, resolveHelpSection } from "@/lib/help";
import { useHelp } from "./help-context";

export interface HelpPanelProps {
  /**
   * The active `?tab=` value, for screens whose help has per-tab sections
   * (the Admin tabbed screens). The caller reads it — the Admin shell client
   * is already inside a <Suspense> for useSearchParams(); the staff shells
   * have no tabbed help and pass `null`.
   */
  tab?: string | null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.06em] text-micro/micro [color:var(--text-tertiary)]">
      {children}
    </div>
  );
}

export function HelpPanel({ tab = null }: HelpPanelProps) {
  const help = useHelp();
  const pathname = usePathname();
  const router = useRouter();

  const topic = helpTopicForPath(pathname);
  const open = !!help?.open && !!topic;

  if (!topic) return null;

  const section = resolveHelpSection(topic, tab);

  return (
    <Drawer
      open={open}
      onClose={() => help?.closeHelp()}
      title={section.title}
      subtitle="How this screen works"
      variant="rail"
    >
      {/* What it is */}
      <p className="font-ui text-sm/body [color:var(--text-secondary)]">
        {section.whatItIs}
      </p>

      {/* Steps */}
      {section.steps && section.steps.length > 0 && (
        <div className="flex flex-col gap-(--sp-4)">
          <SectionLabel>What you do here</SectionLabel>
          {section.steps.map((step, i) => (
            <InstructionalBanner
              key={i}
              step={i + 1}
              title={step.title}
              body={step.body}
            />
          ))}
        </div>
      )}

      {/* Good to know */}
      {section.goodToKnow && section.goodToKnow.length > 0 && (
        <div className="flex flex-col gap-(--sp-4)">
          <SectionLabel>Good to know</SectionLabel>
          <ul className="flex flex-col gap-(--sp-3)">
            {section.goodToKnow.map((line, i) => (
              <li
                key={i}
                className="flex gap-(--sp-4) font-ui text-caption/body [color:var(--text-secondary)]"
              >
                <span
                  aria-hidden
                  className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-(--text-tertiary)"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* See also */}
      {topic.seeAlso && topic.seeAlso.length > 0 && (
        <div className="flex flex-col gap-(--sp-4)">
          <SectionLabel>Related screens</SectionLabel>
          <div className="flex flex-col gap-(--sp-2)">
            {topic.seeAlso.map((link) => (
              <button
                key={link.route}
                type="button"
                onClick={() => {
                  help?.closeHelp();
                  router.push(link.route);
                }}
                className="self-start font-ui font-(--weight-medium) text-caption/sm text-accent kit-interactive kit-focus-ring rounded-sm [--kit-hover-bg:var(--surface-hover)]"
              >
                {link.label} →
              </button>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}
