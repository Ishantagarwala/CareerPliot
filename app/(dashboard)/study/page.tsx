"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, Volume2, SkipBack, SkipForward, Plus, Trash2, Check } from "lucide-react";

interface TodoItem {
  _id: string;
  text: string;
  completed: boolean;
}

interface Track {
  title: string;
  artist: string;
  url: string;
  coverUrl: string;
}

const trackList: Track[] = [
  {
    title: "Lo-Fi Structuralism Vol. 1",
    artist: "Focus Ambient",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFZkTQcbRxChRbnPrST56m2ZH8qPalUYpqlWFli7FFhb-Dwlk8nQmvRaF2stcr_hPyWR-ewYOJhZwW2akHgSXw1tDgSFmdFLe1QHZXemFjhExoZbb1XsvLUapPtMtz8aLC1spm2M1pbT6as_X19XcyA9NwaNBVyLGQFgsTcbrL2rjSP5Bo1rHx59_Mza0MLyECbIuc-oe3e3ghTxGbOqlzuoZRdXNccCHlILRxvLiUHBBS_nGCWzV5njmF6rYJ-I0p7BsAMQd5G2Mt"
  },
  {
    title: "Brutalist Beat Loop",
    artist: "Minimalist Soundlabs",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQ5MIWTViNFT0K7f4QsKJpByBCfzU_t9CGACcwjjfDgXB4dN7Uzx9xi-84KawL2gfmZ_oTb8BmDH-F5XvDfxiyySOkMhOuEbJlJAgcv-xYiU1tCGZOndEQhGbYWCWr_6IjO8uMLjamqbWf52K0MS6-VVJ4yhpvLzur8focF0ngqO2DQA7LzRSrvz_069jE03Z97vJnY1-PX4SPoau6j2cBCjyW3yHgLjDOgccgulYAMxXx3mJMV3JKk98Oo0HOyw1K6YFqv9KxdqTa"
  },
  {
    title: "Cozy Concrete Room",
    artist: "Study Ambient",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCf0wob8XHFLM1Mmu3Td3le_qZ-QK_buDwasDiX1brob_4b8mA1TTEZT_GwV_E8gq42qaxyMqE4GaJD2IoTsb4191CGiaH5Pa3HlPd6qTqISGiAOsW6uLvVwUUx2teMvdE7m5IklypbZmKu4EiMylA9EMKIpqDD2eDY_pQBohU_ocUNSpoprt9VA7I5Anro7Y4HiZEA471FCPdBQd02GxtX5YfQIcC4nAKB8vlYEoK7K3Q36bSSd29IwWt2v1JBDtWTamX1ZiGwdPTc"
  }
];

export default function StudyPage() {
  // To-Do state
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoInput, setTodoInput] = useState("");
  const [todosLoading, setTodosLoading] = useState(true);

  // Pomodoro Timer state
  const [timerMode, setTimerMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Lo-Fi Audio player state
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Focus progress timeframe state
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("year");

  // Load Todos on Mount
  useEffect(() => {
    async function loadTodos() {
      try {
        const res = await fetch("/api/todo");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTodos(data);
      } catch (err) {
        toast.error("Failed to load your daily to-do items");
      } finally {
        setTodosLoading(false);
      }
    }
    loadTodos();
  }, []);

  // Timer intervals
  const getInitialSeconds = (mode: typeof timerMode) => {
    if (mode === "focus") return 25 * 60;
    if (mode === "shortBreak") return 5 * 60;
    return 15 * 60;
  };

  // Switch modes
  const handleSwitchMode = (mode: typeof timerMode) => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerMode(mode);
    setSecondsLeft(getInitialSeconds(mode));
  };

  // Pomodoro TICK logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // Play alert sound or trigger toast
            toast.success(
              timerMode === "focus" 
                ? "Focus interval complete! Take a break." 
                : "Break complete! Time to focus."
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerMode]);

  // Audio lifecycle
  useEffect(() => {
    audioRef.current = new Audio(trackList[currentTrackIdx].url);
    audioRef.current.volume = volume;
    audioRef.current.loop = true;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentTrackIdx]);

  // Play/Pause audio toggle
  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        toast.error("Audio block. Click again to interact.");
      });
      setIsPlaying(true);
    }
  };

  // Skip tracks
  const handleNextTrack = () => {
    const wasPlaying = isPlaying;
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);

    setCurrentTrackIdx((prev) => (prev + 1) % trackList.length);
    
    // Auto play if it was playing previously
    setTimeout(() => {
      if (audioRef.current && wasPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true));
      }
    }, 100);
  };

  const handlePrevTrack = () => {
    const wasPlaying = isPlaying;
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);

    setCurrentTrackIdx((prev) => (prev - 1 + trackList.length) % trackList.length);

    setTimeout(() => {
      if (audioRef.current && wasPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true));
      }
    }, 100);
  };

  // Volume slider update
  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  // Add Todo Item
  const handleAddTodo = async () => {
    if (!todoInput.trim()) return;
    try {
      const res = await fetch("/api/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: todoInput.trim() }),
      });
      if (!res.ok) throw new Error();
      const item = await res.json();
      setTodos([...todos, item]);
      setTodoInput("");
    } catch {
      toast.error("Error adding todo task");
    }
  };

  // Toggle Todo Checked Status
  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/todo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !currentStatus }),
      });
      if (!res.ok) throw new Error();
      const updatedItem = await res.json();
      setTodos(todos.map((t) => (t._id === id ? updatedItem : t)));
    } catch {
      toast.error("Error updating todo state");
    }
  };

  // Delete Todo Item
  const handleDeleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/todo?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setTodos(todos.filter((t) => t._id !== id));
      toast.success("Directive removed");
    } catch {
      toast.error("Error deleting todo item");
    }
  };

  // Render timer digits helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Completed todos count
  const completedCount = todos.filter((t) => t.completed).length;

  // Progress chart datasets
  const chartData = {
    week: [
      { label: "Mon", value: 3.5 },
      { label: "Tue", value: 4.2 },
      { label: "Wed", value: 2.8 },
      { label: "Thu", value: 5.1 },
      { label: "Fri", value: 4.5 },
      { label: "Sat", value: 2.0 },
      { label: "Sun", value: 1.5 }
    ],
    month: [
      { label: "Wk 1", value: 15.2 },
      { label: "Wk 2", value: 18.5 },
      { label: "Wk 3", value: 22.0 },
      { label: "Wk 4", value: 16.8 }
    ],
    year: [
      { label: "Jan", value: 45 },
      { label: "Feb", value: 52 },
      { label: "Mar", value: 60 },
      { label: "Apr", value: 40 },
      { label: "May", value: 55 },
      { label: "Jun", value: 65 },
      { label: "Jul", value: 48 },
      { label: "Aug", value: 50 },
      { label: "Sep", value: 58 },
      { label: "Oct", value: 62 },
      { label: "Nov", value: 54 },
      { label: "Dec", value: 68 }
    ]
  };

  const activeChart = chartData[timeframe];
  const maxVal = Math.max(...activeChart.map((d) => d.value));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">group</span>
            Deep Work Session
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Maintain absolute focus. Distractions have been minimized. Enjoy lo-fi tracks, manage daily directives, and review progress.
          </p>
        </div>
        <div className="flex items-center">
          <span className="inline-flex items-center px-3 py-1 border border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider rounded-none">
            <span className={`w-2 h-2 rounded-full mr-2 ${timerRunning ? "bg-primary animate-pulse" : "bg-muted-foreground"}`}></span>
            {timerRunning ? "Session Active" : "Session Idle"}
          </span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pomodoro Timer and Player Box (Span 8) */}
        <div className="lg:col-span-8 flex flex-col bg-card border border-border relative overflow-hidden">
          
          {/* Subtle background texture */}
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary),_transparent)] pointer-events-none" />

          {/* Pomodoro Tabs */}
          <div className="flex border-b border-border text-xs z-10 font-bold uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <button
              onClick={() => handleSwitchMode("focus")}
              className={`flex-1 py-3 text-center border-r border-border hover:bg-background transition-colors ${timerMode === "focus" ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => handleSwitchMode("shortBreak")}
              className={`flex-1 py-3 text-center border-r border-border hover:bg-background transition-colors ${timerMode === "shortBreak" ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => handleSwitchMode("longBreak")}
              className={`flex-1 py-3 text-center hover:bg-background transition-colors ${timerMode === "longBreak" ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              Long Break (15m)
            </button>
          </div>

          <div className="p-8 flex-grow flex flex-col justify-center items-center relative z-10 min-h-[300px]">
            <div
              className="text-muted-foreground text-xs uppercase tracking-widest mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Current Interval: {timerMode === "focus" ? "Focus" : timerMode === "shortBreak" ? "Short Break" : "Long Break"}
            </div>
            
            {/* Massive Display */}
            <div
              className={`font-bold text-7xl sm:text-[9rem] leading-none tracking-tighter tabular-nums text-foreground ${timerRunning ? "animate-pulse" : ""}`}
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              {formatTime(secondsLeft)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-10">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="bg-primary text-primary-foreground px-8 py-3 font-bold text-xs tracking-wider transition-opacity hover:opacity-90 flex items-center gap-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {timerRunning ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" />
                    PAUSE
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    ENGAGE
                  </>
                )}
              </button>
              <button
                onClick={() => handleSwitchMode(timerMode)}
                className="text-muted-foreground hover:text-foreground px-4 py-3 text-xs font-semibold tracking-wider transition-colors flex items-center gap-2 border border-border bg-background"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <RotateCcw className="h-4 w-4" />
                RESET
              </button>
            </div>
          </div>

          {/* Lo-Fi Music Player Bar */}
          <div className="border-t border-border bg-background/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 bg-accent border border-border flex-shrink-0 relative overflow-hidden">
                <img
                  src={trackList[currentTrackIdx].coverUrl}
                  alt="Track cover"
                  className={`w-full h-full object-cover grayscale opacity-60 ${isPlaying ? "animate-subtle-float" : ""}`}
                />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground leading-snug">{trackList[currentTrackIdx].title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{trackList[currentTrackIdx].artist}</div>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
              <div className="flex items-center gap-4 text-muted-foreground">
                <button onClick={handlePrevTrack} className="hover:text-foreground transition-colors p-1" aria-label="Previous track">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={handleTogglePlay}
                  className="hover:text-foreground text-foreground transition-colors p-1 flex items-center justify-center"
                  aria-label={isPlaying ? "Pause music" : "Play music"}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current" />
                  )}
                </button>
                <button onClick={handleNextTrack} className="hover:text-foreground transition-colors p-1" aria-label="Next track">
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 text-muted-foreground border-l border-border pl-6 shrink-0">
                <Volume2 className="h-4 w-4" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-foreground cursor-pointer h-1 bg-muted rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Daily Directives (Span 4) */}
        <div className="lg:col-span-4 bg-card border border-border flex flex-col h-[480px]">
          
          <div className="p-5 border-b border-border flex justify-between items-center bg-background/20">
            <h3
              className="text-sm font-bold text-foreground uppercase tracking-wider"
              style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
            >
              Daily Directives
            </h3>
            <span
              className="text-[10px] font-bold text-muted-foreground uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {completedCount} / {todos.length} Completed
            </span>
          </div>

          {/* Task lists container */}
          <div className="flex-grow overflow-y-auto">
            {todosLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-background border border-border animate-pulse" />
                ))}
              </div>
            ) : todos.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 text-muted-foreground text-xs italic">
                No directives for today. Define a task below!
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {todos.map((todo) => (
                  <div
                    key={todo._id}
                    className={`flex items-center justify-between p-3.5 hover:bg-background/40 transition-colors ${todo.completed ? "bg-background/10" : ""}`}
                  >
                    <label className="flex items-start gap-3 flex-1 cursor-pointer select-none">
                      <div className="mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 border border-border bg-background">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleTodo(todo._id, todo.completed)}
                          className="sr-only"
                        />
                        {todo.completed && <Check className="h-3 w-3 text-foreground" />}
                      </div>
                      <span className={`text-xs ${todo.completed ? "text-muted-foreground line-through decoration-border/80" : "text-foreground font-medium"}`}>
                        {todo.text}
                      </span>
                    </label>
                    <button
                      onClick={() => handleDeleteTodo(todo._id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0 ml-2"
                      aria-label="Delete directive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Todo Panel */}
          <div className="p-4 border-t border-border bg-background/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={todoInput}
                onChange={(e) => setTodoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTodo();
                }}
                placeholder="Add new directive..."
                className="flex-1 bg-background border border-border p-2 text-foreground text-xs focus:border-primary transition-colors focus:ring-0 rounded-none"
              />
              <button
                onClick={handleAddTodo}
                className="bg-primary text-primary-foreground px-4 py-2 text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Focus progress timeframe details (Span 12) */}
        <div className="lg:col-span-12 bg-card border border-border p-6 shadow-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-border">
            <div>
              <h3
                className="text-xs font-bold text-muted-foreground uppercase tracking-widest"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Focus Metrics Analytics
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Comprehensive review of focus cycles logged</p>
            </div>

            {/* Timeframe picker tabs */}
            <div className="flex border border-border text-[10px] uppercase font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <button
                onClick={() => setTimeframe("week")}
                className={`px-3 py-1.5 border-r border-border hover:bg-background transition-colors ${timeframe === "week" ? "bg-background text-foreground" : "text-muted-foreground"}`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeframe("month")}
                className={`px-3 py-1.5 border-r border-border hover:bg-background transition-colors ${timeframe === "month" ? "bg-background text-foreground" : "text-muted-foreground"}`}
              >
                Month
              </button>
              <button
                onClick={() => setTimeframe("year")}
                className={`px-3 py-1.5 hover:bg-background transition-colors ${timeframe === "year" ? "bg-background text-foreground" : "text-muted-foreground"}`}
              >
                Year
              </button>
            </div>
          </div>

          {/* Dynamic SVG / HTML Bar Chart */}
          <div className="space-y-6">
            <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-border/80 px-2 sm:px-6 select-none relative">
              
              {/* Background Guideline Grid */}
              <div className="absolute inset-x-0 top-0 h-full flex flex-col justify-between pointer-events-none opacity-10">
                <div className="w-full border-t border-dashed border-foreground" />
                <div className="w-full border-t border-dashed border-foreground" />
                <div className="w-full border-t border-dashed border-foreground" />
                <div className="w-full border-t border-dashed border-foreground" />
              </div>

              {activeChart.map((d, index) => {
                const percentage = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-primary text-primary-foreground px-2 py-1 text-[9px] font-bold tracking-wider uppercase transition-opacity pointer-events-none rounded-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {d.value}h
                    </div>

                    {/* Animated Bar */}
                    <div
                      className="w-full max-w-[28px] bg-primary group-hover:opacity-85 transition-all duration-700 ease-out origin-bottom"
                      style={{ height: `${percentage}%` }}
                    />
                    
                    {/* Bottom labels */}
                    <div
                      className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-2 text-center"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {d.label}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Metrics Footer summaries */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-center sm:text-left">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Accumulated Focus Time</span>
                <span className="text-xl font-bold text-foreground mt-1 block">
                  {activeChart.reduce((acc, curr) => acc + curr.value, 0).toFixed(1)} Hours
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Avg. Daily Focus</span>
                <span className="text-xl font-bold text-foreground mt-1 block">
                  {(activeChart.reduce((acc, curr) => acc + curr.value, 0) / activeChart.length).toFixed(1)} Hours
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Productivity Ratio</span>
                <span className="text-xl font-bold text-foreground mt-1 block">94% Efficiency</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
