import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Newsreader } from "next/font/google";
import { authOptions } from "@/lib/auth/config";
import { roleHomePath } from "@/lib/auth/roles";
import { LoginForm } from "./login-form";
import { BrandPanel } from "./brand-panel";
import { MobileBrandHeader } from "./mobile-brand-header";

const newsreader = Newsreader({ subsets: ["latin"], weight: ["500"], variable: "--font-display" });

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(roleHomePath(session.user.role));
  }

  return (
    <main className={`flex min-h-screen w-full flex-col bg-[var(--surface-page)] lg:h-screen lg:flex-row lg:overflow-hidden ${newsreader.variable}`}>
      <MobileBrandHeader />
      <BrandPanel />

      <div className="flex w-full grow flex-col items-start justify-start gap-(--sp-8) overflow-y-auto px-(--sp-6) py-(--sp-9) lg:h-full lg:items-start lg:justify-center lg:gap-5 lg:pl-25">
        <div className="flex w-full max-w-[380px] flex-col gap-(--sp-9) lg:rounded-md lg:border lg:border-solid lg:border-[var(--border-subtle)] lg:p-(--sp-9)">
          <div className="flex flex-col gap-(--sp-3)">
            <p className="hidden font-ui font-(--weight-medium) text-caption/micro tracking-[0.1em] text-accent lg:block">
              STAFF SIGN IN
            </p>
            <h1 className="font-ui font-(--weight-semibold) text-h1/h1 text-[var(--text-primary)] lg:font-display lg:text-[32px] lg:leading-[38px] lg:font-medium">
              Sign in
            </h1>
            <p className="font-ui text-sm/sm text-[var(--text-tertiary)]">Enter your name and 4-digit PIN.</p>
          </div>
          <LoginForm />
        </div>
        <p className="w-full max-w-[380px] font-ui text-caption/micro text-[var(--text-tertiary)]">
          Staff and Admin accounts only — ask your manager for access.
        </p>
      </div>
    </main>
  );
}
