"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";

const AUTH_PROXY_BASE_URL = "/api";
const TOKEN_STORAGE_KEY = "commerce-auth-token";

type AuthView = "login" | "register" | "verify";

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

const categories = [
  {
    name: "Everyday Tech",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    count: "128 picks",
  },
  {
    name: "Home Studio",
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
    count: "84 picks",
  },
  {
    name: "Travel Ready",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    count: "67 picks",
  },
];

const products = [
  {
    name: "AeroPods Max Lite",
    tag: "Best seller",
    price: "$149",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Slate Desk Lamp",
    tag: "New drop",
    price: "$86",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Weekender Carry Kit",
    tag: "Limited",
    price: "$118",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Focus Ceramic Mug",
    tag: "Staff pick",
    price: "$32",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80",
  },
];

const initialFeedback: Feedback = {
  type: "idle",
  message: "Sign in or create an account to personalize your shopping.",
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
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-700">
      {label}
      <input
        className="h-12 rounded-md border border-stone-200 bg-white px-3 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ProductCard({
  product,
}: {
  product: (typeof products)[number];
}) {
  return (
    <article className="group overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        <Image
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          src={product.image}
          alt={product.name}
          width={900}
          height={675}
        />
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              {product.tag}
            </p>
            <h3 className="mt-2 text-base font-bold text-stone-950">
              {product.name}
            </h3>
          </div>
          <p className="font-bold text-stone-950">{product.price}</p>
        </div>
        <button
          className="h-10 rounded-md bg-stone-950 px-3 text-sm font-bold text-white transition hover:bg-stone-800"
          type="button"
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}

export default function Home() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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

  const accountLabel = useMemo(() => {
    if (currentUser) {
      return `Hi, ${currentUser.name.split(" ")[0]}`;
    }

    return accessToken ? "Account" : "Sign in";
  }, [accessToken, currentUser]);

  useEffect(() => {
    queueMicrotask(() => {
      const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        setAccessToken(storedToken);
      }
    });
  }, []);

  const openAuth = (view: AuthView) => {
    setAuthView(view);
    setIsAuthOpen(true);
    setFeedback(initialFeedback);
  };

  const runAction = async (
    action: string,
    callback: () => Promise<string>,
  ) => {
    setPendingAction(action);
    setFeedback({ type: "idle", message: "Working on it..." });

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
      setAuthView("verify");

      return (
        data.message ??
        "Account created. Enter the verification code sent to your email."
      );
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

      setAuthView("login");

      return data.message ?? "Email verified. You can sign in now.";
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
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
      setIsAuthOpen(false);

      return "Welcome back. Your shopping session is ready.";
    });
  };

  const handleLoadAccount = () => {
    if (!accessToken) {
      openAuth("login");
      return;
    }

    void runAction("verify-token", async () => {
      const data = await authRequest<VerifyTokenResponse>("/auth/verify-token", {
        accessToken,
      });

      setCurrentUser(data.user ?? null);
      setIsAuthOpen(true);

      return data.user
        ? `Loaded ${data.user.name}'s account.`
        : "Account session is active.";
    });
  };

  const handleSignOut = () => {
    setAccessToken("");
    setCurrentUser(null);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setFeedback({ type: "idle", message: "You are signed out." });
  };

  return (
    <main className="min-h-screen bg-[#fbfaf8] text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#fbfaf8]/95 backdrop-blur">
        <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <a className="flex items-center gap-3" href="#">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-stone-950 text-lg font-black text-white">
              N
            </span>
            <span>
              <span className="block text-lg font-black leading-5">
                NovaCart
              </span>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Market
              </span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-bold text-stone-700 md:flex">
            <a className="transition hover:text-stone-950" href="#shop">
              Shop
            </a>
            <a className="transition hover:text-stone-950" href="#categories">
              Categories
            </a>
            <a className="transition hover:text-stone-950" href="#deals">
              Deals
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="hidden h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 transition hover:border-stone-950 sm:inline-flex sm:items-center"
              type="button"
              onClick={handleLoadAccount}
            >
              {pendingAction === "verify-token" ? "Checking..." : accountLabel}
            </button>
            <button
              className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
              type="button"
            >
              Cart (0)
            </button>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-12">
        <div className="flex min-h-[560px] flex-col justify-between rounded-md bg-stone-950 p-6 text-white sm:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-300">
              Spring edit is live
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-normal sm:text-7xl">
              Curated goods for sharper everyday living.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-300">
              Discover elevated tech, home essentials, travel gear, and small
              luxuries with an account experience powered by the auth
              microservice.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              className="inline-flex h-12 items-center justify-center rounded-md bg-white px-6 text-sm font-black text-stone-950 transition hover:bg-emerald-100"
              href="#shop"
            >
              Shop New Arrivals
            </a>
            <button
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/30 px-6 text-sm font-black text-white transition hover:bg-white/10"
              type="button"
              onClick={() => openAuth("register")}
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="relative min-h-[360px] overflow-hidden rounded-md bg-stone-200">
            <Image
              className="absolute inset-0 h-full w-full object-cover"
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80"
              alt="Customer browsing premium fashion and lifestyle goods"
              width={1400}
              height={933}
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 to-transparent p-6 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">
                Members save 15%
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Sign in for private offers and faster checkout.
              </h2>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-black">24h</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Fast verification and customer session handling through the auth
                service.
              </p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-black">4.9</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Storefront-ready account flow for favorites, carts, and orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="categories"
        className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              Collections
            </p>
            <h2 className="mt-2 text-3xl font-black text-stone-950">
              Shop by lifestyle
            </h2>
          </div>
          <a className="text-sm font-black text-stone-950 underline" href="#shop">
            Browse all
          </a>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {categories.map((category) => (
            <article
              className="group relative min-h-72 overflow-hidden rounded-md bg-stone-200"
              key={category.name}
            >
              <Image
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                src={category.image}
                alt={category.name}
                width={900}
                height={600}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-sm font-bold text-emerald-200">
                  {category.count}
                </p>
                <h3 className="mt-2 text-2xl font-black">{category.name}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="shop" className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              New arrivals
            </p>
            <h2 className="mt-2 text-3xl font-black text-stone-950">
              Fresh on the shelf
            </h2>
          </div>
          <button
            className="h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-stone-950 transition hover:border-stone-950"
            type="button"
            onClick={() => openAuth("login")}
          >
            Save Favorites
          </button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard product={product} key={product.name} />
          ))}
        </div>
      </section>

      <section id="deals" className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-6 rounded-md border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              Member access
            </p>
            <h2 className="mt-3 text-3xl font-black text-stone-950">
              Your account unlocks faster checkout, order history, and private
              drops.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {["Verified email", "Secure token session", "Reusable profile"].map(
              (item) => (
                <div className="rounded-md bg-stone-100 p-4" key={item}>
                  <p className="text-sm font-black text-stone-950">{item}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Connected to the existing auth service without exposing the
                    backend details to shoppers.
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {isAuthOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-stone-950/60 px-4 py-6 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-md bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-stone-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  NovaCart account
                </p>
                <h2 className="mt-2 text-2xl font-black text-stone-950">
                  {authView === "login"
                    ? "Sign in"
                    : authView === "register"
                      ? "Create account"
                      : "Verify email"}
                </h2>
              </div>
              <button
                className="grid h-10 w-10 place-items-center rounded-md border border-stone-200 text-xl font-bold text-stone-700 transition hover:bg-stone-100"
                type="button"
                aria-label="Close account dialog"
                onClick={() => setIsAuthOpen(false)}
              >
                x
              </button>
            </div>

            <div className="grid gap-5 p-5">
              <div className="grid grid-cols-3 gap-2 rounded-md bg-stone-100 p-1">
                {(["login", "register", "verify"] as AuthView[]).map((view) => (
                  <button
                    className={`h-10 rounded-md text-xs font-black uppercase tracking-[0.08em] transition ${
                      authView === view
                        ? "bg-white text-stone-950 shadow-sm"
                        : "text-stone-500 hover:text-stone-950"
                    }`}
                    key={view}
                    type="button"
                    onClick={() => setAuthView(view)}
                  >
                    {view}
                  </button>
                ))}
              </div>

              <div
                className={`rounded-md border p-4 text-sm leading-6 ${
                  feedback.type === "error"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : feedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 bg-stone-50 text-stone-600"
                }`}
              >
                {feedback.message}
              </div>

              {authView === "login" && (
                <form className="grid gap-4" onSubmit={handleLogin}>
                  <Field
                    label="Email"
                    name="login-email"
                    type="email"
                    value={loginForm.email}
                    placeholder="you@example.com"
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
                  <button
                    className="h-12 rounded-md bg-stone-950 px-4 font-black text-white transition hover:bg-stone-800 disabled:bg-stone-400"
                    type="submit"
                    disabled={pendingAction === "login"}
                  >
                    {pendingAction === "login" ? "Signing in..." : "Sign in"}
                  </button>
                </form>
              )}

              {authView === "register" && (
                <form className="grid gap-4" onSubmit={handleRegister}>
                  <Field
                    label="Name"
                    name="register-name"
                    value={registerForm.name}
                    placeholder="Jane Customer"
                    onChange={(name) =>
                      setRegisterForm((previous) => ({ ...previous, name }))
                    }
                  />
                  <Field
                    label="Email"
                    name="register-email"
                    type="email"
                    value={registerForm.email}
                    placeholder="you@example.com"
                    onChange={(email) =>
                      setRegisterForm((previous) => ({ ...previous, email }))
                    }
                  />
                  <Field
                    label="Password"
                    name="register-password"
                    type="password"
                    value={registerForm.password}
                    placeholder="At least 8 characters"
                    onChange={(password) =>
                      setRegisterForm((previous) => ({ ...previous, password }))
                    }
                  />
                  <button
                    className="h-12 rounded-md bg-emerald-700 px-4 font-black text-white transition hover:bg-emerald-800 disabled:bg-stone-400"
                    type="submit"
                    disabled={pendingAction === "register"}
                  >
                    {pendingAction === "register"
                      ? "Creating account..."
                      : "Create account"}
                  </button>
                </form>
              )}

              {authView === "verify" && (
                <form className="grid gap-4" onSubmit={handleVerifyEmail}>
                  <Field
                    label="Email"
                    name="verify-email"
                    type="email"
                    value={verifyForm.email}
                    placeholder="you@example.com"
                    onChange={(email) =>
                      setVerifyForm((previous) => ({ ...previous, email }))
                    }
                  />
                  <Field
                    label="Verification code"
                    name="verify-code"
                    value={verifyForm.code}
                    placeholder="12345"
                    onChange={(code) =>
                      setVerifyForm((previous) => ({ ...previous, code }))
                    }
                  />
                  <button
                    className="h-12 rounded-md bg-emerald-700 px-4 font-black text-white transition hover:bg-emerald-800 disabled:bg-stone-400"
                    type="submit"
                    disabled={pendingAction === "verify-email"}
                  >
                    {pendingAction === "verify-email"
                      ? "Verifying..."
                      : "Verify email"}
                  </button>
                </form>
              )}

              {accessToken && (
                <div className="grid gap-3 rounded-md border border-stone-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-stone-950">
                      Signed-in session
                    </p>
                    <button
                      className="text-sm font-black text-red-700 underline"
                      type="button"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  </div>
                  {currentUser ? (
                    <p className="text-sm leading-6 text-stone-600">
                      {currentUser.name} is signed in as {currentUser.email}.
                    </p>
                  ) : (
                    <button
                      className="h-10 rounded-md border border-stone-300 text-sm font-black text-stone-950 transition hover:border-stone-950"
                      type="button"
                      disabled={pendingAction === "verify-token"}
                      onClick={handleLoadAccount}
                    >
                      {pendingAction === "verify-token"
                        ? "Loading..."
                        : "Load account"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
