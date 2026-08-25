"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, User } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      name,
      pin,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Invalid name or PIN.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-(--sp-6)">
      <div className="flex flex-col gap-(--sp-2)">
        <label htmlFor="name" className="font-ui font-(--weight-medium) text-caption/micro text-[var(--text-secondary)]">
          Name
        </label>
        <div
          className={cn(
            "flex h-10 items-center gap-(--sp-3) rounded-sm border border-solid px-(--sp-5)",
            "border-[var(--border-strong)] has-[input:focus]:border-[1.5px] has-[input:focus]:border-accent has-[input:focus]:[box-shadow:#3D1E7026_0px_0px_0px_2px]",
          )}
        >
          <User className="size-[15px] shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} aria-hidden />
          <input
            id="name"
            type="text"
            placeholder="e.g. Edwinfred"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
            className="min-w-0 grow border-none bg-transparent font-ui text-sm/sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--text-primary)]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-(--sp-2)">
        <label htmlFor="pin" className="font-ui font-(--weight-medium) text-caption/micro text-[var(--text-secondary)]">
          PIN
        </label>
        <div
          className={cn(
            "flex h-10 items-center gap-(--sp-3) rounded-sm border border-solid px-(--sp-5)",
            "border-[var(--border-strong)] has-[input:focus]:border-[1.5px] has-[input:focus]:border-accent has-[input:focus]:[box-shadow:#3D1E7026_0px_0px_0px_2px]",
          )}
        >
          <Lock className="size-[15px] shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} aria-hidden />
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="····"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
            autoComplete="off"
            className="min-w-0 grow border-none bg-transparent font-ui text-sm/sm tracking-[0.3em] text-[var(--text-primary)] outline-none placeholder:tracking-[0.3em] placeholder:text-[var(--text-tertiary)] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--text-primary)]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="font-ui text-caption/micro text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 items-center justify-center gap-(--sp-3) rounded-sm bg-accent font-ui font-(--weight-medium) text-body/sm text-white outline-none transition-colors hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-70"
      >
        {submitting ? "Signing in…" : "Sign in"}
        {!submitting && <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />}
      </button>
    </form>
  );
}
