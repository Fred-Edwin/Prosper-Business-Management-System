export function MobileBrandHeader() {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-(--sp-4) bg-[var(--nav-bg)] px-(--sp-6) pt-(--sp-8) pb-(--sp-9) lg:hidden">
      <div
        className="size-18 shrink-0 rounded-full bg-cover bg-center"
        style={{ backgroundImage: "url(/prosper-hotel-seal.jpg)" }}
      />
      <p className="font-ui font-(--weight-semibold) text-[18px] leading-6 text-white">Prosper Hotel</p>
    </div>
  );
}
