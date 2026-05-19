"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const AUTH_PROXY_BASE_URL = "/api";
const GATEWAY_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api";

type Feedback = {
  type: "success" | "error" | "idle";
  message: string;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type RegisterResponse = {
  message?: string;
  user?: AuthUser & {
    status?: string;
    verified?: boolean;
  };
};

type LoginResponse = {
  accessToken: string;
};

type VerifyTokenResponse = {
  message?: string;
  user?: AuthUser;
};

type ApiErrorBody = {
  message?: string;
  error?: string;
  details?: {
    message?: string;
    error?: string;
  } | null;
};

const initialFeedback: Feedback = {
  type: "idle",
  message: "Ready for auth service requests.",
};

async function authRequest<TResponse>(
  path: string,
  body: Record<string, string>,
) {
  const response = await fetch(`${AUTH_PROXY_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as
    | TResponse
    | ApiErrorBody;

  if (!response.ok) {
    const errorBody = data as ApiErrorBody;
    const message =
      errorBody.details?.message ??
      errorBody.details?.error ??
      errorBody.message ??
      errorBody.error ??
      "Request failed.";

    throw new Error(message);
  }

  return data as TResponse;
}

function Field({
  label,
  name,
  type = "text",
  value,
  placeholder,
  required = true,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

export default function Home() {
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [verifyForm, setVerifyForm] = useState({
    email: "",
    code: "",
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [accessToken, setAccessToken] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const tokenPreview = useMemo(() => {
    if (!accessToken) {
      return "No access token stored.";
    }

    if (accessToken.length <= 44) {
      return accessToken;
    }

    return `${accessToken.slice(0, 28)}...${accessToken.slice(-12)}`;
  }, [accessToken]);

  useEffect(() => {
    queueMicrotask(() => {
      const storedToken = window.localStorage.getItem("commerce-auth-token");
      if (storedToken) {
        setAccessToken(storedToken);
      }
    });
  }, []);

  const runAction = async (
    action: string,
    callback: () => Promise<string>,
  ) => {
    setPendingAction(action);
    setFeedback({ type: "idle", message: "Sending request..." });

    try {
      const message = await callback();
      setFeedback({ type: "success", message });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Request failed.",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction("register", async () => {
      const data = await authRequest<RegisterResponse>("/auth/register", {
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
      });

      setVerifyForm((previous) => ({
        ...previous,
        email: registerForm.email,
      }));
      setLoginForm((previous) => ({
        ...previous,
        email: registerForm.email,
      }));

      return data.message ?? "User registered successfully.";
    });
  };

  const handleVerifyEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction("verify-email", async () => {
      const data = await authRequest<{ message?: string }>(
        "/auth/verify-email",
        {
          email: verifyForm.email,
          code: verifyForm.code,
        },
      );

      return data.message ?? "Email verified successfully.";
    });
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction("login", async () => {
      const data = await authRequest<LoginResponse>("/auth/login", {
        email: loginForm.email,
        password: loginForm.password,
      });

      setAccessToken(data.accessToken);
      window.localStorage.setItem("commerce-auth-token", data.accessToken);

      return "Login successful. Access token saved locally.";
    });
  };

  const handleVerifyToken = () => {
    void runAction("verify-token", async () => {
      const data = await authRequest<VerifyTokenResponse>("/auth/verify-token", {
        accessToken,
      });

      setCurrentUser(data.user ?? null);

      return data.message ?? "Token verified successfully.";
    });
  };

  const handleClearSession = () => {
    setAccessToken("");
    setCurrentUser(null);
    window.localStorage.removeItem("commerce-auth-token");
    setFeedback({ type: "idle", message: "Local session cleared." });
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              E-commerce microservice
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
              Auth Service Console
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              A focused frontend for account registration, email verification,
              login, and access-token checks through the API gateway.
            </p>
          </div>

          <div className="grid min-w-72 gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Gateway
              </p>
              <p className="mt-1 break-all font-mono text-sm text-slate-900">
                {GATEWAY_BASE_URL}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Session
              </p>
              <p className="mt-1 font-mono text-sm text-slate-900">
                {accessToken ? "Token saved" : "No token"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <form
              className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={handleRegister}
            >
              <SectionTitle eyebrow="Step 1" title="Create Account" />
              <Field
                label="Name"
                name="name"
                value={registerForm.name}
                placeholder="Jane Customer"
                onChange={(name) =>
                  setRegisterForm((previous) => ({ ...previous, name }))
                }
              />
              <Field
                label="Email"
                name="email"
                type="email"
                value={registerForm.email}
                placeholder="jane@example.com"
                onChange={(email) =>
                  setRegisterForm((previous) => ({ ...previous, email }))
                }
              />
              <Field
                label="Password"
                name="password"
                type="password"
                value={registerForm.password}
                placeholder="At least 8 characters"
                onChange={(password) =>
                  setRegisterForm((previous) => ({ ...previous, password }))
                }
              />
              <button
                className="h-11 rounded-md bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                type="submit"
                disabled={pendingAction === "register"}
              >
                {pendingAction === "register" ? "Creating..." : "Register"}
              </button>
            </form>

            <form
              className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              onSubmit={handleVerifyEmail}
            >
              <SectionTitle eyebrow="Step 2" title="Verify Email" />
              <Field
                label="Email"
                name="verify-email"
                type="email"
                value={verifyForm.email}
                placeholder="jane@example.com"
                onChange={(email) =>
                  setVerifyForm((previous) => ({ ...previous, email }))
                }
              />
              <Field
                label="Verification Code"
                name="code"
                value={verifyForm.code}
                placeholder="12345"
                onChange={(code) =>
                  setVerifyForm((previous) => ({ ...previous, code }))
                }
              />
              <button
                className="h-11 rounded-md bg-teal-700 px-4 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                type="submit"
                disabled={pendingAction === "verify-email"}
              >
                {pendingAction === "verify-email" ? "Verifying..." : "Verify"}
              </button>
            </form>
          </div>

          <form
            className="grid gap-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={handleLogin}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <SectionTitle eyebrow="Step 3" title="Login" />
              <p className="text-sm text-slate-500">
                Verified and active users receive a one-hour JWT.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Email"
                name="login-email"
                type="email"
                value={loginForm.email}
                placeholder="jane@example.com"
                onChange={(email) =>
                  setLoginForm((previous) => ({ ...previous, email }))
                }
              />
              <Field
                label="Password"
                name="login-password"
                type="password"
                value={loginForm.password}
                placeholder="Your password"
                onChange={(password) =>
                  setLoginForm((previous) => ({ ...previous, password }))
                }
              />
            </div>
            <button
              className="h-11 rounded-md bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-40"
              type="submit"
              disabled={pendingAction === "login"}
            >
              {pendingAction === "login" ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>

        <aside className="grid content-start gap-6">
          <div
            className={`rounded-md border p-4 shadow-sm ${
              feedback.type === "error"
                ? "border-red-200 bg-red-50 text-red-950"
                : feedback.type === "success"
                  ? "border-teal-200 bg-teal-50 text-teal-950"
                  : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
              Status
            </p>
            <p className="mt-2 text-sm leading-6">{feedback.message}</p>
          </div>

          <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle eyebrow="Step 4" title="Access Token" />
            <div className="rounded-md bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
              {tokenPreview}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="h-11 rounded-md bg-teal-700 px-4 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                type="button"
                disabled={!accessToken || pendingAction === "verify-token"}
                onClick={handleVerifyToken}
              >
                {pendingAction === "verify-token" ? "Checking..." : "Check"}
              </button>
              <button
                className="h-11 rounded-md border border-slate-300 bg-white px-4 font-semibold text-slate-800 transition hover:bg-slate-50"
                type="button"
                onClick={handleClearSession}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle eyebrow="Current User" title="Authorized Profile" />
            {currentUser ? (
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="font-semibold text-slate-500">Name</dt>
                  <dd className="mt-1 text-slate-950">{currentUser.name}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Email</dt>
                  <dd className="mt-1 break-all text-slate-950">
                    {currentUser.email}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Role</dt>
                  <dd className="mt-1 text-slate-950">{currentUser.role}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Verify a saved token to load the authorized user.
              </p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
