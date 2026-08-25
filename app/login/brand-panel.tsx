import { ArrowLeftRight, ClipboardList, MapPin, TrendingUp } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: ClipboardList,
    title: "Every movement traced",
    body: "Stock and cash are an append-only ledger — never a number someone quietly edits.",
  },
  {
    icon: ArrowLeftRight,
    title: "Handovers that reconcile",
    body: "Expected, declared, and received cash — side by side, every shift.",
  },
  {
    icon: MapPin,
    title: "Restaurant, Canteen & Store",
    body: "One system, built for how each location actually operates.",
  },
  {
    icon: TrendingUp,
    title: "A full financial picture",
    body: "Profit, debts, and expenses — always reconciled against the real daily record.",
  },
];

export function BrandPanel() {
  return (
    <div className="relative hidden w-[640px] shrink-0 self-stretch overflow-clip bg-[var(--nav-bg)] lg:flex lg:flex-col">
      <div className="absolute inset-(--sp-8) rounded-lg border border-solid border-[#B8923FCF]" />

      <div className="relative flex flex-1 flex-col justify-start gap-(--sp-12) px-(--sp-11) py-(--sp-10)">
        <div className="mt-(--sp-11) flex flex-col items-center gap-(--sp-6)">
          <div
            className="size-[220px] shrink-0 rounded-full bg-cover bg-center"
            style={{ backgroundImage: "url(/prosper-hotel-seal.jpg)" }}
          />
          <div className="flex w-80 flex-col items-center gap-(--sp-3)">
            <p className="font-ui font-(--weight-medium) text-caption/micro tracking-[0.12em] text-[var(--color-gold-brand)]">
              PROSPER HOTEL
            </p>
            <h1 className="font-display text-[36px] leading-[42px] font-medium text-white">Welcome back</h1>
            <p className="max-w-80 text-center font-ui text-body/body text-white/68">
              Sign in to manage stock, sales, and cash across every location.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-(--sp-8)">
          <div className="flex flex-col gap-(--sp-8)">
            {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex w-full gap-(--sp-5)">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-solid border-[#B8923F66]">
                  <Icon className="size-4 text-[var(--color-gold-brand)]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="flex flex-col gap-(--sp-1)">
                  <p className="font-ui font-(--weight-medium) text-sm/sm text-white">{title}</p>
                  <p className="font-ui text-caption/micro text-white/55">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-(--sp-3) border-t border-solid border-white/10 pt-(--sp-6)">
            <p className="font-ui text-caption/micro text-white/45">Where every guest matters</p>
            <p className="font-ui text-caption/micro text-[var(--color-gold-brand)]">Built by Lobster Technologies</p>
          </div>
        </div>
      </div>
    </div>
  );
}
