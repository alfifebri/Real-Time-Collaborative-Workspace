"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  History,
  Layers,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

type Mode = "signin" | "register";

type LoginViewProps = {
  nextPath: string | null;
};

const FEATURES = [
  {
    title: "Live presence",
    description: "See who is reading and writing, in real time.",
    icon: Users,
  },
  {
    title: "Precise comments",
    description: "Feedback stays anchored to the exact sentence.",
    icon: MessageSquare,
  },
  {
    title: "Version history",
    description: "Every decision is snapshotted and recoverable.",
    icon: History,
  },
] as const;

export function LoginView({ nextPath }: LoginViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToWorkspace = (slug: string | null | undefined) => {
    const destination = nextPath && nextPath.startsWith("/") ? nextPath : slug ? `/w/${slug}` : "/";
    router.push(destination);
    router.refresh();
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setDemoLoading(demoEmail);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: DEMO_PASSWORD }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not start the demo");
      toast.success(`Welcome back, ${payload.user?.name?.split(" ")[0] ?? "teammate"}`);
      goToWorkspace(payload.workspaceSlug);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start the demo";
      setError(message);
      toast.error(message);
    } finally {
      setDemoLoading(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "signin" ? { email, password } : { name, email, password };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Something went wrong");

      toast.success(mode === "signin" ? "Welcome back" : "Your studio is ready");
      goToWorkspace(payload.workspaceSlug);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-[size:56px_56px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_8%,transparent_68%)]" />
      <div className="pointer-events-none absolute -left-56 top-[-10%] h-[520px] w-[520px] rounded-full bg-neon-emerald/[0.045] blur-[130px]" />
      <div className="pointer-events-none absolute -right-44 top-1/3 h-[460px] w-[460px] rounded-full bg-neon-indigo/[0.045] blur-[130px]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-line bg-tint-2 px-3 py-1.5 text-[10px] text-ink-muted backdrop-blur sm:inline-flex">
              <span className="live-dot scale-75" />
              All systems operational
            </span>
            <ThemeSwitcher variant="compact" />
          </div>
        </header>

        <div className="grid flex-1 items-stretch lg:grid-cols-[1.04fr_minmax(440px,0.96fr)]">
          <section className="relative hidden flex-col justify-center px-5 pb-16 pt-6 sm:px-8 lg:flex lg:px-10 xl:px-14">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[560px]"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-tint-2 py-1.5 pl-2 pr-3 text-[10.5px] text-ink-muted backdrop-blur">
                <span className="live-dot" />
                Live collaboration, without the noise
              </div>
              <h1 className="mt-8 font-sans text-[3.35rem] font-medium leading-[1.02] tracking-[-0.055em] text-ink xl:text-[3.85rem]">
                A calmer place
                <br />
                <span className="text-ink-faint">to think together.</span>
              </h1>
              <p className="mt-6 max-w-[450px] text-[14px] leading-7 text-ink-muted">
                Write, comment, and decide in one shared surface. CoWork keeps every
                cursor, version, and conversation in sync — so the work stays in motion.
              </p>

              <div className="mt-10 space-y-1.5">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-line hover:bg-tint-1"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-tint-2 text-ink-muted shadow-soft-inset">
                        <Icon size={14} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-ink">{feature.title}</p>
                        <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-faint">
                          {feature.description}
                        </p>
                      </div>
                      <Check
                        size={13}
                        strokeWidth={1.75}
                        className="ml-auto shrink-0 text-neon-emerald/70"
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 max-w-[520px] overflow-hidden rounded-2xl panel-card"
            >
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-line bg-tint-2 text-ink-faint">
                  <Layers size={11} strokeWidth={1.75} />
                </span>
                <span className="text-[10.5px] font-medium text-ink-muted">
                  Product direction
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[9px] text-ink-faint">
                  <span className="live-dot scale-[0.6]" />
                  3 editing
                </span>
              </div>
              <div className="space-y-2.5 px-4 py-4">
                <div className="h-2.5 w-3/5 rounded-full bg-tint-4" />
                <div className="h-2 w-full rounded-full bg-tint-2" />
                <div className="h-2 w-11/12 rounded-full bg-tint-2" />
                <div className="h-2 w-2/3 rounded-full bg-tint-2" />
                <div className="flex items-center gap-2 pt-1.5">
                  <span className="h-4 w-4 rounded-full bg-neon-cyan" />
                  <span className="live-caret-demo bg-neon-cyan" data-name="Ava" />
                  <span className="text-[9px] text-ink-faint">is refining the brief…</span>
                </div>
              </div>
            </motion.div>
          </section>

          <section className="relative flex items-center justify-center border-line px-5 py-10 sm:px-8 lg:border-l lg:bg-tint-1 lg:px-10">
            <div className="w-full max-w-[440px]">
              <div className="mb-7">
                <p className="eyebrow">Workspace access</p>
                <h2 className="mt-2 font-sans text-[1.7rem] font-medium tracking-[-0.04em] text-ink">
                  {mode === "signin" ? "Welcome back." : "Create your studio."}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                  {mode === "signin"
                    ? "Sign in to continue to your workspace, or jump straight into a demo."
                    : "A workspace, a first page, and a clean slate in under a minute."}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-surface/70 p-1.5 shadow-[0_28px_90px_-54px_rgb(var(--shadow-base)/0.65)] backdrop-blur-xl">
                <div className="relative grid grid-cols-2 gap-1 rounded-xl border border-line/70 bg-tint-1 p-1">
                  {(["signin", "register"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setMode(tab);
                        setError(null);
                      }}
                      className={cn(
                        "relative z-10 rounded-lg px-3 py-2 text-[11.5px] font-medium transition-colors",
                        mode === tab ? "text-ink" : "text-ink-faint hover:text-ink-muted",
                      )}
                    >
                      {mode === tab && (
                        <motion.span
                          layoutId="auth-tab"
                          className="absolute inset-0 rounded-lg border border-line bg-surface-raised shadow-soft-inset"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative">
                        {tab === "signin" ? "Sign in" : "Create account"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="px-4 pb-4 pt-5 sm:px-5">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <form onSubmit={handleSubmit} className="space-y-3.5">
                        {mode === "register" && (
                          <label className="block">
                            <span className="mb-1.5 block text-[10.5px] font-medium text-ink-muted">
                              Full name
                            </span>
                            <div className="relative">
                              <UserRound
                                size={14}
                                strokeWidth={1.75}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                              />
                              <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="field pl-9 text-[12.5px]"
                                placeholder="Ava Chen"
                                autoComplete="name"
                                required
                                minLength={2}
                              />
                            </div>
                          </label>
                        )}

                        <label className="block">
                          <span className="mb-1.5 block text-[10.5px] font-medium text-ink-muted">
                            Email
                          </span>
                          <div className="relative">
                            <Mail
                              size={14}
                              strokeWidth={1.75}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                            />
                            <input
                              type="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              className="field pl-9 text-[12.5px]"
                              placeholder="you@studio.com"
                              autoComplete="email"
                              required
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10.5px] font-medium text-ink-muted">
                            Password
                          </span>
                          <div className="relative">
                            <LockKeyhole
                              size={14}
                              strokeWidth={1.75}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                            />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              className="field pl-9 pr-10 text-[12.5px]"
                              placeholder="••••••••"
                              autoComplete={mode === "signin" ? "current-password" : "new-password"}
                              required
                              minLength={mode === "signin" ? 1 : 8}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((value) => !value)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint transition-colors hover:text-ink"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </label>

                        {error && (
                          <p className="rounded-lg border border-neon-coral/20 bg-neon-coral/[0.06] px-3 py-2 text-[10.5px] text-neon-coral">
                            {error}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={loading || Boolean(demoLoading)}
                          className="button-primary mt-1 w-full py-2.5 text-[12.5px]"
                        >
                          {loading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              {mode === "signin" ? "Enter workspace" : "Create workspace"}
                              <ArrowRight size={14} strokeWidth={1.75} />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-line bg-tint-1 p-2">
                <div className="flex items-center gap-2 px-2 pb-2 pt-1">
                  <Users size={13} strokeWidth={1.75} className="text-ink-faint" />
                  <span className="text-[10.5px] font-medium text-ink-muted">
                    Or continue with a demo workspace
                  </span>
                  <span className="ml-auto rounded border border-line bg-tint-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-faint">
                    {DEMO_PASSWORD}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_ACCOUNTS.map((account, index) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleDemoLogin(account.email)}
                      disabled={Boolean(demoLoading) || loading}
                      className={cn(
                        "group flex min-w-0 items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-left transition-all hover:border-line hover:bg-surface-raised/70 disabled:opacity-60",
                        index === DEMO_ACCOUNTS.length - 1 &&
                          DEMO_ACCOUNTS.length % 2 === 1 &&
                          "col-span-2",
                      )}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[8.5px] font-semibold text-[#0b0d10]"
                        style={{ backgroundColor: account.color }}
                      >
                        {initials(account.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10.5px] font-medium text-ink">
                          {account.name}
                        </span>
                        <span className="block truncate text-[8.5px] uppercase tracking-[0.08em] text-ink-faint">
                          {account.role}
                        </span>
                      </span>
                      {demoLoading === account.email ? (
                        <Loader2 size={12} className="animate-spin text-ink-faint" />
                      ) : (
                        <ArrowUpRight
                          size={12}
                          strokeWidth={1.75}
                          className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[9.5px] text-ink-faint">
                <ShieldCheck size={11} strokeWidth={1.75} />
                Protected by workspace-level permissions.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-tint-3 text-ink shadow-soft-inset">
        <Layers size={15} strokeWidth={1.75} />
      </div>
      <div className="leading-none">
        <p className="font-sans text-[13.5px] font-semibold tracking-[-0.02em] text-ink">
          CoWork <span className="font-normal text-ink-faint">Studio</span>
        </p>
        <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.18em] text-ink-faint">
          Realtime workspace
        </p>
      </div>
    </div>
  );
}
