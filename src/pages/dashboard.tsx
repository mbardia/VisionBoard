import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [boards, setBoards] = useState<any[]>([])
  const [loadingBoards, setLoadingBoards] = useState(false)

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/") // redirect to login
      } else {
        setUser(user)
      }
    }

    getUser()
  }, [router])

  // Fetch vision boards once user is set
  useEffect(() => {
    const fetchBoards = async () => {
      if (!user) return
      setLoadingBoards(true)
      const { data, error } = await supabase
        .from("vision_boards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching boards:", error)
      } else {
        setBoards(data || [])
      }
      setLoadingBoards(false)
    }

    fetchBoards()
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleNewBoard = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      console.error("No user found")
      return
    }

    const { data, error } = await supabase
      .from("vision_boards")
      .insert([
        {
          user_id: currentUser.id,
          name: "Untitled Vision Board",
          
        }
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating board:", error.message)
      return
    }

    // Navigate to visionboard.tsx with the new board ID
    router.push(`/visionboard?id=${data.id}`)
  }

  if (!user) return null // or a spinner

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-6">
      <h1 className="text-3xl font-bold mb-6 text-center">👋 Welcome, {user.email}</h1>

      {/* Create New Vision Board */}
      <button
        onClick={handleNewBoard}
        className="mb-6 bg-purple-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-purple-700 transition"
      >
        ➕ Create New Vision Board
      </button>

      {/* List of Existing Boards */}
      <div className="w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Your Vision Boards</h2>
        {loadingBoards ? (
          <p className="text-gray-400">Loading boards...</p>
        ) : boards.length === 0 ? (
          <p className="text-gray-400">You haven’t created any vision boards yet.</p>
        ) : (
          <ul className="space-y-3">
            {boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={`/visionboard?id=${board.id}`}
                  className="block p-4 rounded-xl bg-white shadow hover:bg-gray-100 transition border"
                >
                  <div className="font-medium">{board.name || "Untitled"}</div>
                  <div className="text-sm text-gray-500">
                    Created: {new Date(board.created_at).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="mt-10 text-sm text-red-500 underline hover:text-red-700"
      >
        Logout
      </button>
    </div>
  )
}
