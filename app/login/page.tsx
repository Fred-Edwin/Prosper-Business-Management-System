import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { roleHomePath } from "@/lib/auth/roles";
import { LoginForm } from "./login-form";

// Functional placeholder only — no design pass has happened yet. This
// sprint is infrastructure (Auth.js wiring); the real login screen is a
// Design Sprint deliverable per CLAUDE.md's Design/Development/QA process.
export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(roleHomePath(session.user.role));
  }

  return (
    <main>
      <h1>Prosper — Sign in</h1>
      <LoginForm />
    </main>
  );
}
