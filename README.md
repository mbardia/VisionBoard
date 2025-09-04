# Visionboard 🎯

A modern web app to **create editable vision boards** and **track goals** — built with Next.js, Supabase, and TailwindCSS.  
Users can try out a demo (edits saved locally) or sign up to save boards and sync goals across devices.

---

## 🚀 Live Demo
Deployed on [**Vercel**](https://vercel.com):  
👉 https://vision-board-eih4.vercel.app/ (replace with your actual Vercel URL)

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org) + React + TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + [Lucide Icons](https://lucide.dev) + [React Icons](https://react-icons.github.io/react-icons)
- **State & Utilities**: React Hooks (`useState`, `useEffect`, `useRef`, `useMemo`)
- **Persistence**: LocalStorage (for demo mode)
- **Auth & Database**: [Supabase](https://supabase.com) (Postgres + Row Level Security)
- **File Storage**: Supabase Storage (for vision board images)
- **Deployment**: [Vercel](https://vercel.com)
- **Other libraries**:
  - [`html2canvas`](https://html2canvas.hertzen.com) → for exporting boards as images
  - [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) → client SDK

---

## 🖼️ Features

- **Vision Board**
  - Drag & drop / upload images into a 3×4 grid
  - Save locally (demo mode)
  - Export board to device (`.png`)
  - Save & sync to Supabase when signed in

- **Goals Tracker**
  - Add / edit / delete goals
  - Mark goals as complete
  - Real-time progress percentage
  - Stored per board for signed-in users

- **Authentication**
  - Email + password signup/login
  - Google OAuth login
  - Supabase session management
  - `/auth/callback` page for redirects

- **Demo Mode**
  - Prefilled example board and goals
  - Edits persist in browser localStorage
  - No account needed

---

## 🧑‍💻 Getting Started

No setup required — the app is live on Vercel.  
👉 Just visit **[Visionboard on Vercel](https://vision-board-eih4.vercel.app/)** and start building your board or trying the demo instantly.

- Use the **demo mode** (no signup needed) to test vision boards and goals.
- Create a free account to **save your boards** and **sync goals** across devices.
