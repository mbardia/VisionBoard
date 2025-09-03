// Debugged visionboard.tsx with proper error handling and navigation
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { IoAddOutline, IoDownloadOutline } from "react-icons/io5";
import { Target, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

const VisionBoard: React.FC = () => {
  const router = useRouter();
  const layoutRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<(string | null)[]>(Array(12).fill(null));
  const [isDownloading, setIsDownloading] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Goal tracking state
  const [goalStats, setGoalStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    completionPercentage: 0,
  });

  const isNewBoard = !boardId;

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error getting user:", userError);
          setError("Authentication error");
          return;
        }
        
        setUser(user);
        console.log("User loaded:", user?.id);
      } catch (err) {
        console.error("User fetch error:", err);
        setError("Failed to load user");
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const loadBoardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const queryId = router.query.id;
        console.log("Query ID from router:", queryId);
        
        if (!queryId || typeof queryId !== "string") {
          console.log("No board ID provided, creating new board");
          setLoading(false);
          return;
        }
        
        setBoardId(queryId);
        console.log("Loading board with ID:", queryId);

        // Get the board name and verify it exists
        const { data: boardData, error: boardError } = await supabase
          .from("vision_boards")
          .select("name, user_id")
          .eq("id", queryId)
          .single();

        if (boardError) {
          console.error("Board fetch error:", boardError);
          setError(`Board not found: ${boardError.message}`);
          setLoading(false);
          return;
        }
        
        if (!boardData) {
          console.error("No board data returned");
          setError("Board not found");
          setLoading(false);
          return;
        }
        
        console.log("Board data loaded:", boardData);
        setBoardName(boardData.name);

        // Load goal statistics (only if user is loaded)
        if (user) {
          await loadGoalStats(queryId);
        }

        // Load images
        const { data: imageData, error: imageError } = await supabase
          .from("vision_board_images")
          .select("file_path, position_index")
          .eq("board_id", queryId);

        if (imageError) {
          console.error("Image fetch error:", imageError);
        } else if (imageData) {
          console.log("Image data loaded:", imageData.length, "images");
          const sortedImages = Array(12).fill(null);
          
          for (const img of imageData) {
            try {
              const { data: urlData } = await supabase.storage
                .from("vision-boards")
                .createSignedUrl(img.file_path, 60 * 60);

              if (urlData?.signedUrl) {
                sortedImages[img.position_index] = urlData.signedUrl;
              }
            } catch (urlError) {
              console.error("Error creating signed URL:", urlError);
            }
          }
          setImages(sortedImages);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Board loading error:", err);
        setError("Failed to load board data");
        setLoading(false);
      }
    };

    // Only load board data if router is ready
    if (router.isReady) {
      loadBoardData();
    }
  }, [router.isReady, router.query.id, user]);

  const loadGoalStats = async (boardId: string) => {
    if (!user?.id) {
      console.log("No user ID available for loading goal stats");
      return;
    }

    try {
      console.log("Loading goal stats for board:", boardId, "user:", user.id);
      
      const { data: goals, error } = await supabase
        .from("goals")
        .select("id, is_completed")
        .eq("board_id", boardId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Goal stats error:", error);
        throw error;
      }

      console.log("Goals loaded:", goals?.length || 0);
      
      const totalGoals = goals?.length || 0;
      const completedGoals = goals?.filter((g) => g.is_completed).length || 0;
      const completionPercentage =
        totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

      setGoalStats({
        totalGoals,
        completedGoals,
        completionPercentage,
      });
      
      console.log("Goal stats updated:", { totalGoals, completedGoals, completionPercentage });
    } catch (error) {
      console.error("Error loading goal stats:", error);
    }
  };

  const handleGoalsClick = () => {
    if (!boardId) {
      console.error("No board ID available for goals navigation");
      alert("Board ID not found. Please save the board first.");
      return;
    }
    
    console.log("Navigating to goals with boardId:", boardId);
    router.push(`/goals?boardId=${boardId}`);
  };

  // Rest of your existing methods remain the same...
  const pickImage = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newImages = [...images];
      newImages[index] = url;
      setImages(newImages);
    }
  };

  const handleDownload = async () => {
    if (images.some((img) => img == null)) {
      window.alert("Please fill all 12 squares before saving.");
      return;
    }

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

      window.alert("Vision board saved to device!");
    } catch (error) {
      console.error("Error saving to device:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveToAccount = async () => {
    if (!boardName.trim()) {
      window.alert("Please enter a name for your vision board.");
      return;
    }

    if (images.some((img) => img == null)) {
      window.alert("Please fill all 12 squares before saving.");
      return;
    }

    try {
      setIsDownloading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        window.alert("You must be logged in to save your board.");
        return;
      }

      const userId = userData.user.id;
      let boardIdToUse = boardId;

      if (isNewBoard) {
        const { data: boardInsertData, error: boardInsertError } = await supabase
          .from("vision_boards")
          .insert([
            {
              user_id: userId,
              name: boardName.trim(),
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (boardInsertError || !boardInsertData?.id) {
          throw boardInsertError || new Error("Board creation failed.");
        }

        boardIdToUse = boardInsertData.id;
      } else {
        await supabase
          .from("vision_boards")
          .update({ name: boardName.trim() })
          .eq("id", boardId);

        await supabase.from("vision_board_images").delete().eq("board_id", boardId);
      }

      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        if (!imageUrl) continue;

        const response = await fetch(imageUrl);
        const blob = await response.blob();

        const imageFileName = `image_${i}_${Date.now()}.png`;
        const imagePath = `boards/${userId}/${boardIdToUse}/${imageFileName}`;

        await supabase.storage.from("vision-boards").upload(imagePath, blob, {
          cacheControl: "3600",
          upsert: true,
        });

        await supabase.from("vision_board_images").insert([
          {
            board_id: boardIdToUse,
            file_path: imagePath,
            position_index: i,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      alert(isNewBoard ? "Vision board saved!" : "Vision board updated!");
      setBoardName("");

      if (isNewBoard && boardIdToUse) {
        router.push(`/visionboard?id=${boardIdToUse}`);
      }
    } catch (error) {
      console.error("Save failed:", error);
      window.alert("Something went wrong while saving.");
    } finally {
      setIsDownloading(false);
    }
  };

  const rows = 3;
  const cols = 4;
  const cellSize = 225;

  // Loading state
  if (loading) {
    return (
      <div style={styles.container(cols, cellSize)}>
        <h1 style={styles.title}>Loading Vision Board...</h1>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container(cols, cellSize)}>
        <h1 style={styles.title}>Error Loading Board</h1>
        <p style={{ color: 'red', marginBottom: 20 }}>{error}</p>
        <button 
          onClick={() => router.push('/dashboard')}
          style={styles.saveBtn}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container(cols, cellSize)}>
      <h1 style={styles.title}>My Vision Board</h1>

      <input
        type="text"
        value={boardName}
        onChange={(e) => setBoardName(e.target.value)}
        placeholder="Name your board"
        style={styles.input}
      />

      {/* Debug info */}
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        Board ID: {boardId || 'New Board'} | User: {user?.id || 'Not logged in'}
      </div>

      {/* Clickable Goal Progress Bar */}
      {boardId && (
        <div
          onClick={handleGoalsClick}
          className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-6 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition"
          style={{ 
            backgroundColor: '#f9fafb', 
            border: '2px solid #e5e7eb', 
            borderRadius: '0.75rem', 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            cursor: 'pointer' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} style={{ color: '#9333ea' }} />
              <span style={{ fontWeight: '600', color: '#374151' }}>
                Goals: {goalStats.completedGoals}/{goalStats.totalGoals} completed
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#9333ea' }}>
                {Math.round(goalStats.completionPercentage)}%
              </span>
              <ArrowRight size={16} style={{ color: '#6b7280' }} />
            </div>
          </div>
          <div style={{ 
            width: '100%', 
            height: '0.5rem', 
            backgroundColor: '#e5e7eb', 
            borderRadius: '9999px', 
            overflow: 'hidden', 
            marginBottom: '0.25rem' 
          }}>
            <div
              style={{ 
                height: '0.5rem', 
                background: 'linear-gradient(to right, #8b5cf6, #9333ea)', 
                borderRadius: '9999px', 
                transition: 'all 0.5s',
                width: `${goalStats.completionPercentage}%`
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
            Click to manage your goals →
          </div>
        </div>
      )}

      {/* Grid */}
      <div ref={layoutRef} style={styles.grid}>
        {[...Array(rows)].map((_, row) => (
          <div key={row} style={styles.row}>
            {[...Array(cols)].map((_, col) => {
              const index = row * cols + col;
              return (
                <div
                  key={col}
                  style={{
                    ...styles.cell,
                    width: cellSize,
                    height: cellSize,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    const input = document.getElementById(
                      `file-input-${index}`
                    ) as HTMLInputElement;
                    input?.click();
                  }}
                >
                  {images[index] ? (
                    <img
                      src={images[index]!}
                      alt={`Vision board cell ${index}`}
                      style={styles.image}
                    />
                  ) : (
                    <IoAddOutline size={56} color="#aaa" />
                  )}
                  <input
                    id={`file-input-${index}`}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => pickImage(index, e)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Save Buttons */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginTop: 24,
        }}
      >
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          style={styles.saveBtn}
        >
          <IoDownloadOutline size={20} color="#fff" />
          <span style={{ marginLeft: 8, fontWeight: "600" }}>Save to Device</span>
        </button>

        <button
          onClick={handleSaveToAccount}
          disabled={isDownloading}
          style={styles.saveBtnAlt}
        >
          <span style={{ fontWeight: "600" }}>Save to Account</span>
        </button>
      </div>
    </div>
  );
};

export default VisionBoard;

const styles = {
  container: (cols: number, cellSize: number): React.CSSProperties => ({
    maxWidth: cols * cellSize,
    margin: "40px auto",
    textAlign: "center",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "0 20px",
  }),
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
    padding: "10px 14px",
    fontSize: 16,
    width: "80%",
    maxWidth: 400,
    border: "1px solid #ccc",
    borderRadius: 8,
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    userSelect: "none",
    backgroundColor: "#FFFFFF",
  } as React.CSSProperties,
  row: {
    display: "flex",
    backgroundColor: "#FFFFFF",
    justifyContent: "flex-start",
  } as React.CSSProperties,
  cell: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderStyle: "solid",
    backgroundColor: "#F0F0F0",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: 0,
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  } as React.CSSProperties,
  saveBtn: {
    backgroundColor: "#1E90FF",
    border: "none",
    padding: "12px 20px",
    color: "#fff",
    fontSize: 16,
    borderRadius: 8,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  } as React.CSSProperties,
  saveBtnAlt: {
    backgroundColor: "#10B981",
    border: "none",
    padding: "12px 20px",
    color: "#fff",
    fontSize: 16,
    borderRadius: 8,
    cursor: "pointer",
  } as React.CSSProperties,
};