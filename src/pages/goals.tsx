import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Plus, Target, Check, X, Trash2, Calendar, Award } from 'lucide-react';
import Head from 'next/head';

interface Goal {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
}

interface VisionBoard {
  id: string;
  name: string;
  user_id: string;
  goal_completion_percentage: number;
}

const GoalsPage: React.FC = () => {
  const router = useRouter();
  const { boardId } = router.query;

  const [user, setUser] = useState<any>(null);
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get user and board data
  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 Initializing goals page...');
        console.log('📍 BoardId from query:', boardId);
        console.log('🔍 Router ready:', router.isReady);
        
        // Get user first
        console.log('👤 Getting user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('❌ User auth error:', userError);
          setError(`Authentication failed: ${userError.message}`);
          return;
        }
        
        if (!user) {
          console.log('❌ No user found, redirecting to home');
          setError('No user logged in');
          return;
        }
        
        console.log('✅ User found:', user.id);
        setUser(user);

        // Wait for router to be ready and boardId to be available
        if (!router.isReady) {
          console.log('⏳ Router not ready yet...');
          setLoading(false);
          return;
        }

        if (!boardId || typeof boardId !== 'string') {
          console.log('❌ No valid boardId found:', boardId);
          setError(`Board ID is invalid: ${boardId}`);
          setLoading(false);
          return;
        }

        console.log('🎯 Fetching board data for:', boardId);
        try {
          await fetchBoardData(boardId, user.id);
          console.log('✅ Board data fetched successfully');
        } catch (boardError) {
          console.error('❌ Board fetch failed:', boardError);
          setError(`Board fetch failed: ${boardError.message}`);
          setLoading(false);
          return;
        }

        console.log('🎯 Fetching goals data for:', boardId);
        try {
          await fetchGoals(boardId, user.id);
          console.log('✅ Goals data fetched successfully');
        } catch (goalsError) {
          console.error('❌ Goals fetch failed:', goalsError);
          // Don't fail the whole page for goals error
          console.log('⚠️ Continuing without goals data');
        }
        
        console.log('✅ Data loading complete');
      } catch (err) {
        console.error('❌ Initialization error:', err);
        setError(`Failed to initialize page: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    // Only initialize when router is ready
    if (router.isReady) {
      initializePage();
    }
  }, [boardId, router.isReady]);

  const fetchBoardData = async (boardId: string, userId: string) => {
    try {
      console.log('📋 Fetching board data for ID:', boardId, 'User:', userId);
      
      // First, let's check if the board exists at all
      console.log('🔍 Checking if board exists...');
      const { data: boardCheck, error: checkError } = await supabase
        .from('vision_boards')
        .select('id, name, user_id')
        .eq('id', boardId);

      if (checkError) {
        console.error('❌ Board check error:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }

      console.log('🔍 Board check result:', boardCheck);

      if (!boardCheck || boardCheck.length === 0) {
        console.error('❌ Board does not exist in database');
        throw new Error(`Board with ID ${boardId} does not exist`);
      }

      const boardData = boardCheck[0];
      console.log('📋 Board found:', boardData);

      // Check if user owns this board
      if (boardData.user_id !== userId) {
        console.error('❌ User does not own this board');
        console.log('Board owner:', boardData.user_id);
        console.log('Current user:', userId);
        throw new Error(`Access denied: You do not own this board (Owner: ${boardData.user_id})`);
      }

      // Add goal_completion_percentage if it doesn't exist
      const completeBoard = {
        ...boardData,
        goal_completion_percentage: boardData.goal_completion_percentage || 0
      };

      setBoard(completeBoard);
      console.log('✅ Board data set successfully');
      return completeBoard;
    } catch (error) {
      console.error('❌ Error fetching board:', error);
      throw error; // Re-throw with original error
    }
  };

  const fetchGoals = async (boardId: string, userId: string) => {
    try {
      console.log('🎯 Fetching goals for board:', boardId, 'user:', userId);
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('board_id', boardId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Goals fetch error:', error);
        throw error;
      }

      console.log('🎯 Goals data:', data?.length || 0, 'goals found');
      setGoals(data || []);
    } catch (error) {
      console.error('❌ Error fetching goals:', error);
      // Don't throw here - we can still show the page even if goals fail to load
    }
  };

  const addGoal = async () => {
    if (!newGoalTitle.trim() || !user || !boardId) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([{
          board_id: boardId as string,
          user_id: user.id,
          title: newGoalTitle.trim(),
          description: newGoalDescription.trim() || null,
          is_completed: false
        }])
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => [data, ...prev]);
      setNewGoalTitle('');
      setNewGoalDescription('');
      setIsAddingGoal(false);

      await updateBoardCompletion();
    } catch (error) {
      console.error('Error adding goal:', error);
      alert('Failed to add goal. Please try again.');
    }
  };

  const toggleGoalCompletion = async (goalId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(prev =>
        prev.map(goal =>
          goal.id === goalId
            ? {
              ...goal,
              is_completed: !currentStatus,
              completed_at: !currentStatus ? new Date().toISOString() : undefined
            }
            : goal
        )
      );

      await updateBoardCompletion();
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      await updateBoardCompletion();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const updateBoardCompletion = async () => {
    if (!boardId || !user) return;

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.is_completed).length;
    const percentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    setBoard(prev => prev ? { ...prev, goal_completion_percentage: percentage } : null);
  };

  const goBackToBoard = () => {
    if (boardId) {
      console.log('🔙 Navigating back to board:', boardId);
      router.push(`/visionboard?id=${boardId}`);
    } else {
      console.log('🔙 No boardId, going to dashboard');
      router.push('/dashboard');
    }
  };

  const goToDashboard = () => {
    console.log('🏠 Navigating to dashboard');
    router.push('/dashboard');
  };

  const completedGoals = goals.filter(g => g.is_completed);
  const pendingGoals = goals.filter(g => !g.is_completed);
  const completionPercentage = goals.length > 0 ? (completedGoals.length / goals.length) * 100 : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading goals...</p>
          <p className="text-sm text-gray-500 mt-2">Board ID: {boardId || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Goals</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500 mb-6">
            <p>Board ID: {boardId || 'Not provided'}</p>
            <p>User ID: {user?.id || 'Not logged in'}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={goToDashboard}
              className="w-full bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Board not found state
  if (!board) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Board Not Found</h1>
          <p className="text-gray-600 mb-4">The requested vision board could not be found.</p>
          <div className="text-sm text-gray-500 mb-6">
            <p>Board ID: {boardId}</p>
            <p>User ID: {user?.id}</p>
          </div>
          <button
            onClick={goToDashboard}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Goals - {board.name} | VisionBoard</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={goBackToBoard}
              className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Vision Board</span>
            </button>

            <button
              onClick={goToDashboard}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dashboard
            </button>
          </div>

          {/* Debug Info (remove in production) */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Board ID: {boardId}</p>
            <p>User ID: {user?.id}</p>
            <p>Board Name: {board?.name}</p>
            <p>Goals Count: {goals.length}</p>
          </div>

          {/* Board Title and Progress */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Goals for "{board.name}"
            </h1>
            <p className="text-gray-600">Track your progress and achieve your dreams</p>
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Progress Overview</h3>
                  <p className="text-gray-600">
                    {completedGoals.length} of {goals.length} goals completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round(completionPercentage)}%
                </div>
                <div className="text-sm text-gray-500">Complete</div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>

            {goals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{goals.length}</div>
                  <div className="text-sm text-gray-600">Total Goals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{completedGoals.length}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{pendingGoals.length}</div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
              </div>
            )}
          </div>

          {/* Add New Goal */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            {isAddingGoal ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Goal</h3>
                <input
                  type="text"
                  placeholder="What do you want to achieve?"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <textarea
                  placeholder="Add more details about your goal (optional)..."
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
                <div className="flex items-center space-x-3">
                  <button
                    onClick={addGoal}
                    disabled={!newGoalTitle.trim()}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Goal
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingGoal(false);
                      setNewGoalTitle('');
                      setNewGoalDescription('');
                    }}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingGoal(true)}
                className="w-full p-4 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add New Goal</span>
              </button>
            )}
          </div>

          {/* Goals List */}
          {goals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Target className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No goals yet</h3>
              <p className="text-gray-500 mb-6">
                Start by adding your first goal to track your progress
              </p>
              <button
                onClick={() => setIsAddingGoal(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Your First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white rounded-xl shadow-md p-6 flex items-start justify-between hover:shadow-lg transition-all"
                >
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={() => toggleGoalCompletion(goal.id, goal.is_completed)}
                      className={`p-2 rounded-full border ${
                        goal.is_completed
                          ? 'bg-green-100 border-green-400 text-green-600'
                          : 'bg-gray-100 border-gray-300 text-gray-400 hover:text-purple-600 hover:border-purple-400'
                      } transition-colors`}
                    >
                      {goal.is_completed ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </button>

                    <div>
                      <h4
                        className={`text-lg font-semibold ${
                          goal.is_completed ? 'line-through text-gray-500' : 'text-gray-800'
                        }`}
                      >
                        {goal.title}
                      </h4>
                      {goal.description && (
                        <p className="text-gray-600 mt-1">{goal.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Created {new Date(goal.created_at).toLocaleDateString()}
                        </span>
                        {goal.is_completed && goal.completed_at && (
                          <>
                            <Award className="h-4 w-4 text-green-600" />
                            <span>
                              Completed {new Date(goal.completed_at).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GoalsPage;
