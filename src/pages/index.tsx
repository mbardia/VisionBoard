import Head from "next/head";
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { IoAddOutline, IoDownloadOutline } from "react-icons/io5";
import { Target, Check, X, Trash2, Plus, ShieldCheck, Sparkles, Rocket } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";


/**
 * ====== DEMO DATA (edit these) ======
 * Place images in /public/demo/... or use hosted URLs.
 */
const DEMO_BOARD_NAME = "Manasvi — 2025 Vision Board";
const DEMO_IMAGES: string[] = [
  "/demo/Screenshot 2025-07-08 at 13.47.22.png",
  "/demo/Screenshot 2025-07-08 at 13.48.31.png",
  "/demo/Screenshot 2025-07-08 at 13.50.39.png",
  "/demo/Screenshot 2025-07-08 at 13.52.00.png",
  "/demo/Screenshot 2025-07-08 at 13.55.23.png",
  "/demo/Screenshot 2025-07-08 at 13.57.29.png",
  "/demo/Screenshot 2025-07-08 at 14.10.19.png",
  "/demo/Screenshot 2025-07-08 at 14.07.17.png",
  "/demo/Screenshot 2025-07-08 at 14.11.12.png",
  "/demo/vb1.jpg",
  "/demo/Screenshot 2025-07-08 at 13.58.01.png",
  "/demo/Screenshot 2025-07-08 at 14.09.17.png",
];

type Goal = {
  id: string;
  title: string;
  description?: string | null;
  is_completed: boolean;
  created_at: string;
  completed_at?: string | null;
};

const DEMO_GOALS: Goal[] = [
  { id: "d1", title: "Ship Visionboard v1.0", description: "MVP shipped, polish UI", is_completed: true, created_at: new Date(Date.now()-864e5*30).toISOString(), completed_at: new Date().toISOString() },
  { id: "d2", title: "Hit 3/5 weekly workouts", description: "Strength + mobility", is_completed: false, created_at: new Date(Date.now()-864e5*12).toISOString() },
  { id: "d3", title: "Read 12 books in 2025", description: "6/12 done", is_completed: false, created_at: new Date(Date.now()-864e5*50).toISOString() },
  { id: "d4", title: "Visit Paris", description: "Plan spring 2026", is_completed: false, created_at: new Date(Date.now()-864e5*7).toISOString() },
];

/**
 * ====== VisionBoardDemo (editable, local only) ======
 */
function VisionBoardDemo() {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [boardName, setBoardName] = useState<string>(DEMO_BOARD_NAME);
  const [images, setImages] = useState<(string | null)[]>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("demo_vb_images");
      if (raw) { try { return JSON.parse(raw); } catch {} }
    }
    return DEMO_IMAGES.slice(0, 12);
  });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("demo_vb_images", JSON.stringify(images));
      localStorage.setItem("demo_vb_name", boardName);
    }
  }, [images, boardName]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawName = localStorage.getItem("demo_vb_name");
      if (rawName) setBoardName(rawName);
    }
  }, []);

  const pickImage = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const next = [...images];
    next[index] = url;
    setImages(next);
  };

  const handleDownload = async () => {
    if (!layoutRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(layoutRef.current);
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = "vision-board.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section id="demo-vision" className="mt-16">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Try the Vision Board (Editable, just click on any of the cells to replace it with a picture of your own)</h2>
        <div className="text-xs text-gray-500">Demo • Edits stay on this device only</div>
      </div>

      <input
        type="text"
        value={boardName}
        onChange={(e) => setBoardName(e.target.value)}
        placeholder="Name your board"
        className="mb-3 w-full max-w-md rounded-lg border px-3 py-2 text-sm"
      />

      {/* Grid */}
      <div ref={layoutRef} className="select-none">
        {[0,1,2].map((row) => (
          <div key={row} className="flex">
            {[0,1,2,3].map((col) => {
              const index = row * 4 + col;
              return (
                <div
                  key={col}
                  className="m-0 h-[225px] w-[225px] cursor-pointer items-center justify-center overflow-hidden border-2 border-white bg-neutral-100 flex"
                  onClick={() => document.getElementById(`vb-input-${index}`)?.click()}
                >
                  {images[index] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[index]!} alt={`cell-${index}`} className="h-full w-full object-cover" />
                  ) : (
                    <IoAddOutline size={56} color="#aaa" />
                  )}
                  <input
                    id={`vb-input-${index}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickImage(index, e)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <IoDownloadOutline size={18} className="mr-2" />
          Save to Device
        </button>
      </div>
    </section>
  );
}

/**
 * ====== GoalsDemo (editable, local only) ======
 */
function GoalsDemo() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("demo_goals");
      if (raw) { try { return JSON.parse(raw); } catch {} }
    }
    return DEMO_GOALS;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("demo_goals", JSON.stringify(goals));
    }
  }, [goals]);

  const completed = useMemo(() => goals.filter(g => g.is_completed), [goals]);
  const pct = useMemo(() => goals.length ? (completed.length / goals.length) * 100 : 0, [goals, completed]);

  const addGoal = () => {
    if (!title.trim()) return;
    const g: Goal = {
      id: `demo-${Date.now()}`,
      title: title.trim(),
      description: desc.trim() || null,
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    setGoals(prev => [g, ...prev]);
    setTitle("");
    setDesc("");
    setIsAdding(false);
  };

  const toggle = (id: string, cur: boolean) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, is_completed: !cur, completed_at: !cur ? new Date().toISOString() : null } : g));
  };

  const del = (id: string) => {
    if (!confirm("Delete this goal?")) return;
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  return (
    <section id="demo-goals" className="mt-16">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Track Goals (Editable)</h2>
        <div className="text-xs text-gray-500">Demo • Edits stay on this device only</div>
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">Progress Overview</div>
              <div className="text-sm text-gray-600">
                {completed.length} of {goals.length} goals completed
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600">{Math.round(pct)}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>
        <div className="mb-2 h-3 w-full rounded-full bg-gray-200">
          <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Add Goal */}
      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        {isAdding ? (
          <div>
            <div className="mb-3 text-lg font-semibold">Add New Goal</div>
            <input
              className="mb-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="What do you want to achieve?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="mb-3 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Add more details (optional)..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={addGoal}
                disabled={!title.trim()}
                className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Add Goal
              </button>
              <button
                onClick={() => { setIsAdding(false); setTitle(""); setDesc(""); }}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-purple-300 p-4 text-purple-600 hover:border-purple-400 hover:bg-purple-50"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Add New Goal</span>
          </button>
        )}
      </div>

      {/* Goals list */}
      <div className="mt-4 space-y-4">
        {goals.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <Target className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <div className="mb-2 text-lg font-semibold text-gray-700">No goals yet</div>
            <div className="mb-4 text-sm text-gray-500">Start by adding your first goal</div>
            <button onClick={() => setIsAdding(true)} className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
              Add Your First Goal
            </button>
          </div>
        ) : goals.map((g) => (
          <div key={g.id} className="flex items-start justify-between rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggle(g.id, g.is_completed)}
                className={`rounded-full border p-2 transition-colors ${
                  g.is_completed
                    ? "border-green-400 bg-green-100 text-green-600"
                    : "border-gray-300 bg-gray-100 text-gray-400 hover:border-purple-400 hover:text-purple-600"
                }`}
              >
                {g.is_completed ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </button>
              <div>
                <div className={`text-lg font-semibold ${g.is_completed ? "line-through text-gray-500" : "text-gray-800"}`}>
                  {g.title}
                </div>
                {g.description && <div className="mt-1 text-gray-600">{g.description}</div>}
                <div className="mt-2 text-xs text-gray-500">
                  Created {new Date(g.created_at).toLocaleDateString()}
                  {g.is_completed && g.completed_at ? ` • Completed ${new Date(g.completed_at).toLocaleDateString()}` : ""}
                </div>
              </div>
            </div>
            <button onClick={() => del(g.id)} className="text-gray-400 hover:text-red-600">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * ====== Sign Up (Supabase) ======
 */
function SignUpCard() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!email.trim() || !pw.trim()) {
      setMsg({ type: "error", text: "Please enter an email and password." });
      return;
    }
    if (pw !== pw2) {
      setMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);
      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: { emailRedirectTo },
      });

      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({
          type: "success",
          text: "Check your inbox to confirm your email. Once confirmed, you can sign in.",
        });
        setEmail("");
        setPw("");
        setPw2("");
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message ?? "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="signup" className="mt-20">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <div>
            <h3 className="text-xl font-semibold">Create your account</h3>
            <p className="text-sm text-gray-600">Save boards, sync goals, and pick up anywhere.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {msg && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {loading ? "Creating..." : "Sign Up"}
            </button>
            <a href="/login" className="text-sm text-gray-600 hover:underline">
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </section>
  );
}

/**
 * ====== Home Page ======
 * Now a true landing page—no links out to /visionboard or /goals.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      }
    };
    checkUser();
  }, [router]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const signUpWithEmail = async () => {
    const email = prompt("Email?");
    const password = prompt("Password?");
    if (!email || !password) return;
    await supabase.auth.signUp({ email, password });
  };
  return (
    <>
      <Head>
        <title>Visionboard — Home</title>
      </Head>

      {/* ===== Header (brand only) ===== */}
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold">Visionboard</div>
          {/* Optional: add a subtle sign-in link only */}
          <a href="/login" className="text-sm text-gray-600 hover:underline">
            Sign in
          </a>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Plan boldly. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Build daily.</span>
            </h1>
            <p className="mt-3 text-lg text-gray-600">
              Craft a vision board and track goals in one place. Try the live demo below—
              no account needed. Sign up when you’re ready to save and sync.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#demo-vision" className="rounded-2xl bg-black px-5 py-2.5 text-white hover:opacity-90">
                Try the demo
              </a>
              <a href="#signup" className="rounded-2xl border px-5 py-2.5 hover:bg-gray-50">
                Create an account
              </a>
            </div>
          </div>

          {/* mini features */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <div className="mt-2 font-semibold">Drag & drop tiles</div>
              <div className="text-sm text-gray-600">Quickly assemble a collage that motivates you.</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <Target className="h-6 w-6 text-blue-600" />
              <div className="mt-2 font-semibold">Goals that stick</div>
              <div className="text-sm text-gray-600">Lightweight tracking with real-time progress.</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <div className="mt-2 font-semibold">Private by default</div>
              <div className="text-sm text-gray-600">Demo edits live only on your device until you sign up.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Main content: Demos + Sign Up ===== */}
      <main className="mx-auto max-w-6xl px-4 pb-12">
        <VisionBoardDemo />
        <GoalsDemo />
        <SignUpCard />
      </main>

      {/* ===== Footer ===== */}
      <footer className="mt-12 border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500">
          © {new Date().getFullYear()} Visionboard — Demo mode on home page
        </div>
      </footer>
    </>
  );
}
