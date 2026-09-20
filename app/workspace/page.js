"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveNaturalDate, getRelativeDateLabel, formatDate } from "@/lib/extractor";
import { normalizeTaskText } from "@/lib/textUtils";

const NOTE_POOL_URGENT = [
  "Deploy hotfix for the login session timeout before 2pm",
  "Pay rent tomorrow before late fee penalty kicks in",
  "Fix broken checkout button on production immediately",
  "Submit client tax filings before midnight tonight",
  "Emergency: renew expired SSL certificate for api domain today",
  "Server CPU alert on cluster 4, investigate root cause before EOD",
  "Respond to critical security advisory email before 5pm today",
];

const NOTE_POOL_FOCUS = [
  "Draft architectural blueprint for real-time analytics pipeline by Friday",
  "Audit MongoDB connection pool performance and tune slow queries",
  "Consolidate personal tax receipts and download annual statements next Wednesday",
  "Finalize slide deck for quarterly strategy review on Thursday afternoon",
  "Refactor state management in dashboard to reduce re-renders",
  "Write end-to-end integration tests for payment webhooks by Monday morning",
  "Organize workspace repository documentation and update README",
  "Configure automated daily MongoDB backups to encrypted S3 bucket",
];

const NOTE_POOL_SCHEDULED = [
  "Catch flight on Sunday morning at 8am",
  "Prepare presentation for quarterly sync on Thursday afternoon",
  "Call dentist to reschedule appointment for next Tuesday",
  "Pick up dry cleaning before 6pm Friday",
  "Renew car insurance policy before the 28th",
  "Dentist checkup on Wednesday at 11am",
  "Annual eye exam scheduled for next Thursday 2pm",
];

const NOTE_POOL_CASUAL = [
  "Clean desk and organize bookshelf",
  "Order new ergonomic mouse wrist rest",
  "Buy groceries: olive oil, sourdough, and dark roast coffee beans",
  "Schedule routine car oil change this weekend",
  "Water balcony plants and repot the monstera",
  "Pick up package from parcel locker downstairs",
  "Backup laptop photos to external SSD",
  "Drop off library books before next week",
];

const NOTE_POOL_IDEAS_FACTS = [
  "Remember that photosynthesis happens in chloroplasts",
  "Maybe learn acoustic guitar someday",
  "Dopamine synthesis requires vitamin B6 as a key cofactor",
  "Idea: build an offline-first markdown notes sync tool someday",
  "The Tokyo subway system carries over 8 million passengers daily",
  "Coffee tastes sweeter when brewed between 90 and 93 degrees Celsius",
  "Maybe write a short sci-fi story about orbital elevators",
  "Human eye blinks approximately 15 to 20 times per minute",
  "Octopuses have three hearts and blue blood",
];

// Generates dynamic, realistic human-written scratchpads with varied formatting
function generateHumanNotes() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sample = (arr, count) => {
    const copy = [...arr].sort(() => 0.5 - Math.random());
    return copy.slice(0, count);
  };

  const selected = [
    pick(NOTE_POOL_URGENT),
    ...sample(NOTE_POOL_FOCUS, 2),
    pick(NOTE_POOL_SCHEDULED),
    pick(NOTE_POOL_CASUAL),
    pick(NOTE_POOL_IDEAS_FACTS),
  ];

  const shuffled = selected.sort(() => 0.5 - Math.random());
  const style = Math.floor(Math.random() * 3);
  if (style === 0) {
    return shuffled.map((item) => `- ${item}`).join("\n");
  } else if (style === 1) {
    return shuffled.map((item) => (Math.random() > 0.4 ? `• ${item}` : `- ${item}`)).join("\n");
  } else {
    return shuffled.join("\n");
  }
}

const INITIAL_STARTER_TASKS = [
  {
    id: "task_seed_1",
    text: "Prepare slide deck for quarterly sync by Friday",
    completed: false,
    priority_score: 2.85,
    priority_label: "Urgent",
    priority_confidence: 0.92,
    priority_flag: "confident",
    deadline: "2026-09-25",
    deadline_flag: "confident",
    deadline_confidence: 0.88,
    is_task: true,
    is_task_confidence: 0.96,
    user_edited: { text: false, priority: false, deadline: false },
    status: "sorted",
  },
  {
    id: "task_seed_2",
    text: "Pay rent tomorrow before late fee",
    completed: false,
    priority_score: 2.7,
    priority_label: "Urgent",
    priority_confidence: 0.9,
    priority_flag: "confident",
    deadline: "2026-09-21",
    deadline_flag: "confident",
    deadline_confidence: 0.95,
    is_task: true,
    is_task_confidence: 0.94,
    user_edited: { text: false, priority: false, deadline: false },
    status: "sorted",
  },
  {
    id: "task_seed_3",
    text: "Review draft contract terms and follow up Monday",
    completed: false,
    priority_score: 1.8,
    priority_label: "Days",
    priority_confidence: 0.85,
    priority_flag: "confident",
    deadline: "2026-09-21",
    deadline_flag: "confident",
    deadline_confidence: 0.84,
    is_task: true,
    is_task_confidence: 0.91,
    user_edited: { text: false, priority: false, deadline: false },
    status: "sorted",
  },
  {
    id: "task_seed_4",
    text: "Call dentist for routine appointment",
    completed: true,
    priority_score: 1.2,
    priority_label: "Weeks",
    priority_confidence: 0.8,
    priority_flag: "confident",
    deadline: "",
    deadline_flag: "none",
    deadline_confidence: 0,
    is_task: true,
    is_task_confidence: 0.88,
    user_edited: { text: false, priority: false, deadline: false },
    status: "sorted",
  },
];

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[parseInt(parts[1], 10) - 1];
  const d = parseInt(parts[2], 10);
  return `${m} ${d}`;
}

function ModernDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const baseDate = value ? new Date(value + "T12:00:00") : new Date();
  const [viewYear, setViewYear] = useState(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(baseDate.getMonth());

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day, e) => {
    e.stopPropagation();
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handlePreset = (type, e) => {
    e.stopPropagation();
    const now = new Date();
    if (type === "today") {
      onChange(formatDate(now));
    } else if (type === "tomorrow") {
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      onChange(formatDate(tmrw));
    } else if (type === "week") {
      const wk = new Date(now);
      wk.setDate(wk.getDate() + 7);
      onChange(formatDate(wk));
    } else if (type === "clear") {
      onChange("");
    }
    setIsOpen(false);
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDateNum = isCurrentMonth ? today.getDate() : -1;

  let selectedDayNum = -1;
  if (value) {
    const [y, m, d] = value.split("-").map(Number);
    if (y === viewYear && m - 1 === viewMonth) {
      selectedDayNum = d;
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {value ? (
        <div
          onClick={() => {
            if (value) {
              const [y, m] = value.split("-").map(Number);
              setViewYear(y);
              setViewMonth(m - 1);
            }
            setIsOpen(!isOpen);
          }}
          className="modern-date-pill"
          title="Click to change date"
        >
          <span style={{ fontSize: "12px", color: "var(--color-primary)" }}>📅</span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink)" }}>
            {formatDisplayDate(value)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="date-clear-btn"
            title="Clear date"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="modern-date-empty-btn"
          title="Click to set deadline"
        >
          <span style={{ fontSize: "11px", opacity: 0.7 }}>📅</span>
          <span>Set date</span>
        </button>
      )}

      {isOpen && (
        <div className="modern-date-popover">
          <div style={{ display: "flex", gap: "5px", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--color-hairline)" }}>
            <button type="button" onClick={(e) => handlePreset("today", e)} className="date-preset-pill">
              Today
            </button>
            <button type="button" onClick={(e) => handlePreset("tomorrow", e)} className="date-preset-pill">
              Tomorrow
            </button>
            <button type="button" onClick={(e) => handlePreset("week", e)} className="date-preset-pill">
              In 1 Wk
            </button>
            {value && (
              <button type="button" onClick={(e) => handlePreset("clear", e)} className="date-preset-pill" style={{ color: "var(--color-error)" }}>
                Clear
              </button>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <button type="button" onClick={handlePrevMonth} className="date-nav-arrow" title="Previous Month">
              ‹
            </button>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink)" }}>
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={handleNextMonth} className="date-nav-arrow" title="Next Month">
              ›
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "4px" }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--color-muted)", padding: "2px 0" }}>
                {d}
              </span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank_${i}`} style={{ height: "26px" }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = day === selectedDayNum;
              const isToday = day === todayDateNum;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => handleSelectDay(day, e)}
                  style={{
                    height: "26px",
                    width: "26px",
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: isToday && !isSelected ? "1px solid var(--color-primary)" : "none",
                    backgroundColor: isSelected
                      ? "var(--color-primary)"
                      : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : isToday
                      ? "var(--color-primary)"
                      : "var(--color-ink)",
                    fontSize: "12px",
                    fontWeight: isSelected || isToday ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "var(--color-surface-soft)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Data state
  const [tasks, setTasks] = useState([]);
  const [nonTasks, setNonTasks] = useState([
    {
      id: "seed_nontask_1",
      text: "Maybe learn guitar someday",
      is_task_confidence: 0.38,
      priority_score: 0.2,
    },
    {
      id: "seed_nontask_2",
      text: "Remember that photosynthesis happens in chloroplasts",
      is_task_confidence: 0.08,
      priority_score: 0.0,
    },
  ]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState("checking");

  // Modal State for Delete Confirmation
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Modal State for Inspecting Decision Basis & Score
  const [inspectingItem, setInspectingItem] = useState(null);

  // AI Sorter Drawer State
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [sortingAi, setSortingAi] = useState(false);
  const [isRollingDice, setIsRollingDice] = useState(false);

  // Active View Filter: 'active' | 'urgent' | 'scheduled' | 'completed' | 'all' | 'ideas' | 'basis'
  const [currentView, setCurrentView] = useState("active");

  // Mobile Drawer Navigation State
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  // Quick Add input state
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddPriority, setQuickAddPriority] = useState("Days");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const quickAddInputRef = useRef(null);

  // Check URL params for ?drawer=open or ?demo=true or ?tab=basis
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "basis") {
        setCurrentView("basis");
      }
      if (params.get("drawer") === "open" || params.get("demo") === "true") {
        setShowAiDrawer(true);
        if (params.get("demo") === "true" && !notesText) {
          setNotesText(generateHumanNotes());
        }
      }
    }
  }, []);

  // 1. Authenticate user on mount
  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setIsAuthChecking(false);
          loadUserTasksFromDb();
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (mounted) router.replace("/login");
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  // Handle escape key to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (inspectingItem) setInspectingItem(null);
        if (taskToDelete) setTaskToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [taskToDelete, inspectingItem]);

  // Load tasks from MongoDB (with localStorage fallback)
  const loadUserTasksFromDb = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setDbStatus("connected");
        if (data.tasks && data.tasks.length > 0) {
          setTasks(data.tasks);
          if (data.nonTasks) setNonTasks(data.nonTasks);
          setIsLoaded(true);
          return;
        }
      }
    } catch (err) {
      console.warn("MongoDB initial fetch warning, checking localStorage fallback", err);
      setDbStatus("offline");
    }

    try {
      const savedTasks = localStorage.getItem("cadence_personal_tasks_v1");
      const savedNonTasks = localStorage.getItem("cadence_personal_nontasks_v1");
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        setTasks(parsed);
        syncTasksToDb(parsed, savedNonTasks ? JSON.parse(savedNonTasks) : nonTasks);
      } else {
        setTasks(INITIAL_STARTER_TASKS);
        syncTasksToDb(INITIAL_STARTER_TASKS, nonTasks);
      }

      if (savedNonTasks) {
        setNonTasks(JSON.parse(savedNonTasks));
      }
    } catch {
      setTasks(INITIAL_STARTER_TASKS);
    }
    setIsLoaded(true);
  };

  // Sync tasks to MongoDB
  const syncTasksToDb = async (currentTasks, currentNonTasks) => {
    setIsSyncingDb(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          tasks: currentTasks,
          nonTasks: currentNonTasks,
        }),
      });
      if (res.ok) {
        setDbStatus("connected");
      } else {
        setDbStatus("offline");
      }
    } catch {
      setDbStatus("offline");
    } finally {
      setIsSyncingDb(false);
    }
  };

  // Persist locally & to DB on changes
  useEffect(() => {
    if (!isLoaded || isAuthChecking) return;

    try {
      localStorage.setItem("cadence_personal_tasks_v1", JSON.stringify(tasks));
      localStorage.setItem("cadence_personal_nontasks_v1", JSON.stringify(nonTasks));
    } catch (e) {
      console.warn("Local storage write warning", e);
    }

    const timeout = setTimeout(() => {
      syncTasksToDb(tasks, nonTasks);
    }, 800);

    return () => clearTimeout(timeout);
  }, [tasks, nonTasks, isLoaded, isAuthChecking]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  // Generate and set fresh random human notes (Focus / Solo style)
  const handleLoadRandomNotes = () => {
    setIsRollingDice(true);
    let nextNotes = generateHumanNotes();
    if (nextNotes === notesText) {
      nextNotes = generateHumanNotes();
    }
    setNotesText(nextNotes);
    setTimeout(() => setIsRollingDice(false), 600);
  };

  // Toggle Task Completion
  const handleToggleComplete = (taskId) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      syncTasksToDb(updated, nonTasks);
      return updated;
    });
  };

  // Prompt Confirmation to Delete Task
  const promptDeleteTask = (task) => {
    setTaskToDelete(task);
  };

  // Confirm and Execute Delete Task
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const idToDelete = taskToDelete.id;

    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== idToDelete);
      syncTasksToDb(updated, nonTasks);
      return updated;
    });
    setTaskToDelete(null);

    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(idToDelete)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("MongoDB delete sync warning:", err);
    }
  };

  // Clear Completed Tasks
  const handleClearCompleted = () => {
    setTasks((prev) => {
      const updated = prev.filter((t) => !t.completed);
      syncTasksToDb(updated, nonTasks);
      return updated;
    });
  };

  // Update Field Inline
  const handleUpdateField = (taskId, field, value) => {
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            [field]: value,
            user_edited: {
              ...t.user_edited,
              [field]: true,
            },
            ...(field === "deadline" ? { deadline_flag: "confident" } : {}),
          };
        }
        return t;
      });
      return updated;
    });
  };

  // Quick Add Task with Natural Language Date Recognition ("today", "tomorrow", "in a week", etc.)
  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickAddText.trim() || isAddingTask) return;

    setIsAddingTask(true);

    // Detect natural relative date (today, tomorrow, in a week, etc.)
    const detected = resolveNaturalDate(quickAddText.trim());
    let deadline = "";
    let deadlineFlag = "none";
    let deadlineConfidence = 0;
    let priority = quickAddPriority;
    let score = 2.0;

    if (detected && detected.date) {
      deadline = detected.date;
      deadlineFlag = "confident";
      deadlineConfidence = detected.confidence;

      // If user hasn't explicitly picked a priority from dropdown (kept default 'Days'),
      // calibrate urgency based on proximity
      if (quickAddPriority === "Days") {
        if (detected.label === "Today") {
          priority = "Urgent";
          score = 3.0;
        } else if (detected.label === "Tomorrow" || detected.label === "In 2 days") {
          priority = "Days";
          score = 2.0;
        } else if (detected.label?.includes("week") || detected.label?.includes("month")) {
          priority = "Weeks";
          score = 1.0;
        }
      } else {
        if (priority === "Urgent") score = 3.0;
        else if (priority === "Weeks") score = 1.0;
        else if (priority === "Someday") score = 0.0;
      }
    } else {
      if (priority === "Urgent") score = 3.0;
      else if (priority === "Weeks") score = 1.0;
      else if (priority === "Someday") score = 0.0;
    }

    const normalizedText = normalizeTaskText(quickAddText);

    const newTask = {
      id: `task_${Date.now()}`,
      text: normalizedText,
      completed: false,
      priority_score: score,
      priority_label: priority,
      priority_confidence: 0.9,
      priority_flag: "confident",
      deadline: deadline,
      deadline_flag: deadlineFlag,
      deadline_confidence: deadlineConfidence,
      is_task: true,
      user_edited: { text: true, priority: true, deadline: Boolean(deadline) },
      status: "manual",
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      syncTasksToDb(updated, nonTasks);
      return updated;
    });
    setQuickAddText("");
    setTimeout(() => setIsAddingTask(false), 300);
  };

  // Convert Non-Task to Task
  const handleConvertToTask = (item) => {
    setConvertingId(item.id);
    const newTask = {
      id: `task_${Date.now()}`,
      text: normalizeTaskText(item.text),
      completed: false,
      priority_score: item.priority_score ?? 1.0,
      priority_label: "Days",
      priority_confidence: 0.8,
      priority_flag: "confident",
      deadline: "",
      deadline_flag: "none",
      deadline_confidence: 0,
      is_task: true,
      user_edited: { text: false, priority: false, deadline: false },
      status: "converted",
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev].sort((a, b) => b.priority_score - a.priority_score);
      syncTasksToDb(updated, nonTasks.filter((nt) => nt.id !== item.id));
      return updated;
    });
    setNonTasks((prev) => prev.filter((nt) => nt.id !== item.id));
    setCurrentView("active");
    setTimeout(() => setConvertingId(null), 400);
  };

  // AI Sort & Ingest
  const handleAiSortAndMerge = async () => {
    if (!notesText.trim()) return;
    setSortingAi(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notesText,
          people: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sort notes with Jev");
      }

      const newItems = (data.tasks || []).map((t) => ({ ...t, completed: false }));
      const mergedTasks = [...newItems, ...tasks].sort((a, b) => b.priority_score - a.priority_score);
      setTasks(mergedTasks);

      let mergedNonTasks = nonTasks;
      if (data.nonTasks?.length > 0) {
        mergedNonTasks = [...data.nonTasks, ...nonTasks];
        setNonTasks(mergedNonTasks);
      }

      syncTasksToDb(mergedTasks, mergedNonTasks);
      setNotesText("");
      setShowAiDrawer(false);
      setCurrentView("active");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSortingAi(false);
    }
  };

  // Counts for Sidebar Navigation
  const activeTasksCount = tasks.filter((t) => !t.completed).length;
  const urgentTasksCount = tasks.filter((t) => !t.completed && (t.priority_label === "Urgent" || t.priority_score >= 2.5)).length;
  const scheduledTasksCount = tasks.filter((t) => !t.completed && Boolean(t.deadline)).length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  // Filter Tasks by Current Sidebar View & Search Query
  const filteredTasks = tasks.filter((task) => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!task.text.toLowerCase().includes(query)) return false;
    }

    if (currentView === "active") return !task.completed;
    if (currentView === "urgent") return !task.completed && (task.priority_label === "Urgent" || task.priority_score >= 2.5);
    if (currentView === "scheduled") return !task.completed && Boolean(task.deadline);
    if (currentView === "completed") return task.completed;
    return true; // 'all'
  });

  if (isAuthChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf9f5",
          color: "#6b665f",
          fontFamily: "var(--font-sans, Inter, sans-serif)",
          fontSize: "0.95rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: "2px solid #cc785c",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Connecting to Cadence...
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Get human friendly view heading
  const getViewTitle = () => {
    switch (currentView) {
      case "active":
        return "Active Tasks";
      case "urgent":
        return "Urgent Focus";
      case "scheduled":
        return "Scheduled Tasks";
      case "completed":
        return "Completed Tasks";
      case "all":
        return "All Tasks";
      case "ideas":
        return "Ideas & Facts Vault";
      case "basis":
        return "Evaluation Basis";
      default:
        return "Workspace";
    }
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Sidebar Backdrop Overlay */}
      {showMobileSidebar && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* =========================================================================
          1. LEFT SIDEBAR (Desktop Fixed + Mobile Off-Canvas Drawer)
          ========================================================================= */}
      <aside className={`dashboard-sidebar ${showMobileSidebar ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", padding: "0 4px" }}>
          <Link
            href="/"
            onClick={() => setShowMobileSidebar(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
              aria-label="Cadence Logo"
            >
              <path
                d="M 18 6.5 A 8.5 8.5 0 1 0 18 17.5"
                stroke="var(--color-ink)"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="2.75" fill="var(--color-primary)" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--color-ink)",
                letterSpacing: "-0.4px",
                lineHeight: 1,
              }}
            >
              Cadence
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Mobile Drawer Close Button */}
            <button
              type="button"
              onClick={() => setShowMobileSidebar(false)}
              className="mobile-sidebar-close-btn"
              title="Close navigation"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Primary Quick Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "22px" }}>
          <button
            type="button"
            onClick={() => {
              if (currentView === "ideas" || currentView === "basis") {
                setCurrentView("active");
              }
              setShowMobileSidebar(false);
              setTimeout(() => {
                quickAddInputRef.current?.focus();
              }, 50);
            }}
            className="btn-primary"
            style={{
              height: "36px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "var(--radius-sm)",
              width: "100%",
            }}
          >
            <span>+</span>
            <span>New Task</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAiDrawer(!showAiDrawer);
              setShowMobileSidebar(false);
            }}
            disabled={sortingAi}
            className={`btn-secondary ${sortingAi ? "btn-evaluating" : ""}`}
            style={{
              height: "34px",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "var(--radius-sm)",
              width: "100%",
              backgroundColor: showAiDrawer ? "var(--color-canvas)" : "transparent",
              borderColor: showAiDrawer ? "var(--color-primary)" : "var(--color-hairline)",
            }}
          >
            {sortingAi ? (
              <>
                <span className="btn-spinner btn-spinner-coral" style={{ width: "12px", height: "12px" }} />
                <span>Evaluating notes...</span>
              </>
            ) : (
              <>
                <span style={{ color: "var(--color-primary)" }}>✦</span>
                <span>{showAiDrawer ? "Hide AI Parser" : "Paste Messy Notes..."}</span>
              </>
            )}
          </button>
        </div>

        {/* Section 1: Task Views Navigation */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "10.5px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "var(--color-muted)",
              padding: "0 8px 6px",
            }}
          >
            Tasks
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentView("active");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "active" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📥</span>
              <span>Active</span>
            </div>
            <span className={`sidebar-badge ${currentView === "active" ? "active" : ""}`}>
              {activeTasksCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentView("urgent");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "urgent" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔥</span>
              <span>Urgent</span>
            </div>
            <span className={`sidebar-badge ${currentView === "urgent" ? "active" : ""}`}>
              {urgentTasksCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentView("scheduled");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "scheduled" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📅</span>
              <span>Scheduled</span>
            </div>
            <span className={`sidebar-badge ${currentView === "scheduled" ? "active" : ""}`}>
              {scheduledTasksCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentView("all");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "all" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📋</span>
              <span>All Tasks</span>
            </div>
            <span className={`sidebar-badge ${currentView === "all" ? "active" : ""}`}>
              {tasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentView("completed");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "completed" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>✓</span>
              <span>Completed</span>
            </div>
            <span className={`sidebar-badge ${currentView === "completed" ? "active" : ""}`}>
              {completedTasksCount}
            </span>
          </button>
        </div>

        {/* Section 2: Knowledge & System */}
        <div style={{ marginBottom: "auto" }}>
          <div
            style={{
              fontSize: "10.5px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "var(--color-muted)",
              padding: "0 8px 6px",
            }}
          >
            Knowledge
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentView("ideas");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "ideas" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>💡</span>
              <span>Ideas &amp; Facts</span>
            </div>
            <span className={`sidebar-badge ${currentView === "ideas" ? "active" : ""}`}>
              {nonTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentView("basis");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "basis" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚖</span>
              <span>Evaluation Basis</span>
            </div>
          </button>
        </div>

        {/* Sidebar Footer: User Account */}
        <div
          style={{
            paddingTop: "14px",
            borderTop: "1px solid var(--color-hairline)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(24, 23, 21, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#cc785c",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {currentUser?.email ? currentUser.email[0].toUpperCase() : "U"}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--color-ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
                title={currentUser?.email}
              >
                {currentUser?.email}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "11px",
                color: "var(--color-muted)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px",
              }}
              title="Sign Out"
            >
              Exit
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
            <Link
              href="/"
              style={{
                fontSize: "11px",
                color: "var(--color-muted)",
                textDecoration: "none",
              }}
            >
              ← Overview
            </Link>
            <span style={{ fontSize: "10px", color: "var(--color-muted-soft)" }}>
              TypeSafe Jev v1.0
            </span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA
          ========================================================================= */}
      <main className="dashboard-content">
        {/* Mobile Top App Bar (visible on screens <= 768px) */}
        <div className="dashboard-mobile-header">
          <button
            type="button"
            onClick={() => setShowMobileSidebar(true)}
            className="mobile-menu-btn"
            aria-label="Open navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 18 6.5 A 8.5 8.5 0 1 0 18 17.5" stroke="var(--color-ink)" strokeWidth="2.25" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2.75" fill="var(--color-primary)" />
            </svg>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "19px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.3px" }}>
              Cadence
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setShowAiDrawer(!showAiDrawer)}
              disabled={sortingAi}
              className={`btn-secondary ${sortingAi ? "btn-evaluating" : ""}`}
              style={{ height: "32px", fontSize: "11.5px", padding: "0 10px", gap: "5px", display: "inline-flex", alignItems: "center" }}
              title="Open AI Note Parser"
            >
              {sortingAi ? (
                <>
                  <span className="btn-spinner btn-spinner-coral" style={{ width: "11px", height: "11px" }} />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--color-primary)" }}>✦</span>
                  <span>{showAiDrawer ? "Hide" : "Ingest"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top View Bar */}
        <header
          className="dashboard-header-inner"
          style={{
            padding: "16px 28px",
            borderBottom: "1px solid var(--color-hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            backgroundColor: "var(--color-canvas)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h1
              className="dashboard-header-title"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "26px",
                fontWeight: 500,
                color: "var(--color-ink)",
                letterSpacing: "-0.5px",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {getViewTitle()}
            </h1>
          </div>

          {/* Search bar & View Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {currentView !== "basis" && (
              <div style={{ position: "relative", minWidth: "140px" }}>
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    height: "32px",
                    padding: "0 12px 0 28px",
                    fontSize: "12.5px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-hairline)",
                    backgroundColor: "var(--color-surface-soft)",
                    color: "var(--color-ink)",
                    outline: "none",
                    width: "100%",
                    maxWidth: "180px",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "12px",
                    color: "var(--color-muted)",
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      fontSize: "11px",
                      color: "var(--color-muted)",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {currentView === "completed" && completedTasksCount > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="btn-secondary"
                style={{ height: "32px", fontSize: "12px", padding: "0 10px" }}
              >
                Clear Completed
              </button>
            )}
          </div>
        </header>

        {/* Content Container */}
        <div className="dashboard-main-padding" style={{ padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "var(--color-error)",
                fontSize: "13.5px",
              }}
            >
              <strong>Notice: </strong>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI BRAINDUMP PARSER DRAWER (if open) */}
          {showAiDrawer && (
            <div
              className="claude-card"
              style={{
                backgroundColor: "var(--color-canvas)",
                borderColor: "var(--color-primary)",
                borderWidth: "1.5px",
                boxShadow: "0 10px 30px rgba(204, 120, 92, 0.08)",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "19px",
                      fontWeight: 500,
                      color: "var(--color-ink)",
                      margin: 0,
                    }}
                  >
                    TypeSafe Jev Note Parser
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--color-muted)", margin: "3px 0 0 0" }}>
                    Paste bullets or raw thoughts. Jev extracts tasks, urgency scores, and deadlines directly into MongoDB.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLoadRandomNotes}
                  className="btn-secondary"
                  style={{
                    fontSize: "12px",
                    height: "30px",
                    padding: "0 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                  title="Generate fresh, randomized human-style scratchpad notes"
                >
                  <span
                    className={isRollingDice ? "dice-roll" : ""}
                    style={{ display: "inline-block", fontSize: "13px" }}
                  >
                    🎲
                  </span>
                  <span>Load Random Notes</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Paste raw thoughts, bullets, or scratchpad notes here..."
                className="claude-textarea"
                style={{ width: "100%", boxSizing: "border-box", marginBottom: "14px" }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAiDrawer(false)}
                  className="btn-secondary"
                  style={{ height: "34px", fontSize: "13px" }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAiSortAndMerge}
                  disabled={sortingAi || !notesText.trim()}
                  className={`btn-primary ${sortingAi ? "btn-evaluating" : ""}`}
                  style={{
                    height: "36px",
                    fontSize: "13px",
                    minWidth: "185px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {sortingAi ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Evaluating with Jev</span>
                      <span className="eval-dots"><span>.</span><span>.</span><span>.</span></span>
                    </>
                  ) : (
                    <span>Sort &amp; Ingest Notes →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* QUICK ADD INLINE BAR (Visible on task views) */}
          {currentView !== "ideas" && currentView !== "basis" && (
            <form onSubmit={handleQuickAdd} className="quick-add-form">
              <div className="quick-add-input-wrapper">
                <input
                  ref={quickAddInputRef}
                  type="text"
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  placeholder='+ Add task, e.g. "Prepare presentation tomorrow", "Deploy today", "Review code in a week"...'
                  className="claude-input"
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: quickAddText.trim() && resolveNaturalDate(quickAddText) ? "0 145px 0 14px" : "0 14px",
                    backgroundColor: "var(--color-surface-card)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-hairline)",
                    fontSize: "13.5px",
                    transition: "padding 0.15s ease",
                  }}
                />
                {/* Live Detected Natural Date Chip */}
                {quickAddText.trim() && resolveNaturalDate(quickAddText) && (
                  <span
                    className={`quick-add-detected-badge ${
                      resolveNaturalDate(quickAddText).label === "Today"
                        ? "badge-coral"
                        : resolveNaturalDate(quickAddText).label === "Tomorrow"
                        ? "badge-amber"
                        : "badge-teal"
                    }`}
                    style={{
                      position: "absolute",
                      right: "8px",
                      fontSize: "11px",
                      pointerEvents: "none",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    📅 {resolveNaturalDate(quickAddText).date} ({resolveNaturalDate(quickAddText).label})
                  </span>
                )}
              </div>

              <div className="quick-add-actions">
                <select
                  value={quickAddPriority}
                  onChange={(e) => setQuickAddPriority(e.target.value)}
                  className={`claude-select priority-${quickAddPriority.toLowerCase()}`}
                  style={{
                    height: "38px",
                    minWidth: "115px",
                    fontSize: "12.5px",
                  }}
                  title="Default Priority"
                >
                  <option value="Urgent">🔥 Urgent</option>
                  <option value="Days">⚡ Days</option>
                  <option value="Weeks">📅 Weeks</option>
                  <option value="Someday">⏳ Someday</option>
                </select>

                <button
                  type="submit"
                  disabled={!quickAddText.trim() || isAddingTask}
                  className={`btn-primary ${isAddingTask ? "btn-evaluating" : ""}`}
                  style={{
                    height: "38px",
                    padding: "0 16px",
                    fontSize: "13px",
                    borderRadius: "var(--radius-sm)",
                    minWidth: "64px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  {isAddingTask ? <span className="btn-spinner" style={{ width: "12px", height: "12px" }} /> : <span>Add</span>}
                </button>
              </div>
            </form>
          )}

          {/* TAB: TASKS VIEWS */}
          {currentView !== "ideas" && currentView !== "basis" && (
            <>
              {filteredTasks.length === 0 ? (
                <div className="claude-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-muted)" }}>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    {searchQuery
                      ? `No tasks matching "${searchQuery}".`
                      : currentView === "completed"
                      ? "No completed tasks yet. Check off items as you finish them."
                      : currentView === "urgent"
                      ? "No urgent tasks. Clear to focus on routine items."
                      : currentView === "scheduled"
                      ? "No scheduled tasks with deadlines."
                      : "No tasks found. Use the quick add bar above or paste messy notes."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="desktop-tasks-table claude-card" style={{ padding: 0, overflow: "hidden" }}>
                    <div className="claude-table-container">
                      <table className="claude-table">
                        <thead>
                          <tr>
                            <th style={{ width: "36px", padding: "10px 8px 10px 14px" }}></th>
                            <th style={{ minWidth: "260px" }}>Task</th>
                            <th style={{ width: "160px", minWidth: "160px" }}>Priority &amp; Score</th>
                            <th style={{ width: "135px", minWidth: "135px" }}>Deadline</th>
                            <th style={{ width: "140px", minWidth: "140px" }}>Decision Basis</th>
                            <th style={{ width: "36px", textAlign: "right", paddingRight: "14px" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTasks.map((task) => (
                            <tr key={task.id} style={{ opacity: task.completed ? 0.6 : 1 }}>
                              {/* Checkbox */}
                              <td style={{ verticalAlign: "top", paddingTop: "12px" }}>
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleComplete(task.id)}
                                  className="claude-checkbox"
                                  aria-label="Toggle completed"
                                />
                              </td>

                              {/* Task Text - Auto-expanding for 100% full visibility */}
                              <td style={{ verticalAlign: "top", paddingTop: "8px" }}>
                                <textarea
                                  value={task.text}
                                  rows={1}
                                  onChange={(e) => {
                                    handleUpdateField(task.id, "text", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = e.target.scrollHeight + "px";
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      el.style.height = "auto";
                                      el.style.height = el.scrollHeight + "px";
                                    }
                                  }}
                                  className="claude-task-textarea"
                                  style={{
                                    color: task.completed ? "var(--color-muted)" : "var(--color-ink)",
                                    textDecoration: task.completed ? "line-through" : "none",
                                  }}
                                />
                              </td>

                              {/* Priority Selector & Calibrated Score */}
                              <td style={{ verticalAlign: "top", paddingTop: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
                                  <select
                                    value={task.priority_label || "Days"}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      let score = 1.0;
                                      if (val === "Urgent") score = 3.0;
                                      else if (val === "Days") score = 2.0;
                                      else if (val === "Weeks") score = 1.0;
                                      else if (val === "Someday") score = 0.0;
                                      handleUpdateField(task.id, "priority_label", val);
                                      handleUpdateField(task.id, "priority_score", score);
                                    }}
                                    className={`claude-select priority-${(task.priority_label || "days").toLowerCase()}`}
                                    style={{
                                      height: "28px",
                                      minWidth: "100px",
                                    }}
                                    title="Calibrated Priority"
                                  >
                                    <option value="Urgent">🔥 Urgent</option>
                                    <option value="Days">⚡ Days</option>
                                    <option value="Weeks">📅 Weeks</option>
                                    <option value="Someday">⏳ Someday</option>
                                  </select>

                                  <span
                                    className="score-pill"
                                    title={`Calibrated urgency score: ${task.priority_score ? task.priority_score.toFixed(2) : "2.00"} / 3.0`}
                                  >
                                    {task.priority_score ? task.priority_score.toFixed(1) : "2.0"}
                                  </span>
                                </div>
                              </td>

                              {/* Deadline - Custom Modern Themed Popover Picker */}
                              <td style={{ verticalAlign: "top", paddingTop: "8px" }}>
                                <ModernDatePicker
                                  value={task.deadline || ""}
                                  onChange={(newDate) => handleUpdateField(task.id, "deadline", newDate)}
                                />
                              </td>

                              {/* Decision Basis & Score Badge */}
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setInspectingItem(task)}
                                  className="badge-teal"
                                  style={{
                                    cursor: "pointer",
                                    border: "none",
                                    fontSize: "11px",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontWeight: 500,
                                    transition: "all 0.1s ease",
                                  }}
                                  title="Click to inspect mathematical decision basis"
                                >
                                  <span>✓ Task</span>
                                  <span>({Math.round((task.is_task_confidence || 0.95) * 100)}%)</span>
                                  <span style={{ opacity: 0.6, fontSize: "10px" }}>ⓘ</span>
                                </button>
                              </td>

                              {/* Action: Delete Task (opens modal) */}
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => promptDeleteTask(task)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--color-muted)",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    padding: "4px 6px",
                                    borderRadius: "4px",
                                    transition: "color 0.15s ease",
                                  }}
                                  title="Delete Task"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Touch Cards View (visible on <= 768px) */}
                  <div className="mobile-tasks-cards">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="mobile-task-card"
                        style={{ opacity: task.completed ? 0.6 : 1 }}
                      >
                        {/* Top Row: Checkbox + Auto-expanding Textarea */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", width: "100%" }}>
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleToggleComplete(task.id)}
                            className="claude-checkbox"
                            aria-label="Toggle completed"
                            style={{ marginTop: "4px", width: "18px", height: "18px", flexShrink: 0 }}
                          />
                          <textarea
                            value={task.text}
                            rows={1}
                            onChange={(e) => {
                              handleUpdateField(task.id, "text", e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = "auto";
                                el.style.height = el.scrollHeight + "px";
                              }
                            }}
                            className="claude-task-textarea"
                            style={{
                              fontSize: "14px",
                              lineHeight: 1.45,
                              color: task.completed ? "var(--color-muted)" : "var(--color-ink)",
                              textDecoration: task.completed ? "line-through" : "none",
                            }}
                          />
                        </div>

                        {/* Middle Row: Priority Selector, Score Pill & Deadline */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            flexWrap: "wrap",
                            paddingTop: "6px",
                            borderTop: "1px dashed var(--color-hairline-soft)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <select
                              value={task.priority_label || "Days"}
                              onChange={(e) => {
                                const val = e.target.value;
                                let score = 1.0;
                                if (val === "Urgent") score = 3.0;
                                else if (val === "Days") score = 2.0;
                                else if (val === "Weeks") score = 1.0;
                                else if (val === "Someday") score = 0.0;
                                handleUpdateField(task.id, "priority_label", val);
                                handleUpdateField(task.id, "priority_score", score);
                              }}
                              className={`claude-select priority-${(task.priority_label || "days").toLowerCase()}`}
                              style={{
                                height: "28px",
                                minWidth: "98px",
                                fontSize: "11.5px",
                              }}
                              title="Calibrated Priority"
                            >
                              <option value="Urgent">🔥 Urgent</option>
                              <option value="Days">⚡ Days</option>
                              <option value="Weeks">📅 Weeks</option>
                              <option value="Someday">⏳ Someday</option>
                            </select>

                            <span
                              className="score-pill"
                              title={`Calibrated urgency score: ${task.priority_score ? task.priority_score.toFixed(1) : "2.0"} / 3.0`}
                            >
                              {task.priority_score ? task.priority_score.toFixed(1) : "2.0"}
                            </span>
                          </div>

                          <div>
                            <ModernDatePicker
                              value={task.deadline || ""}
                              onChange={(newDate) => handleUpdateField(task.id, "deadline", newDate)}
                            />
                          </div>
                        </div>

                        {/* Bottom Row: Decision Basis badge + Delete button */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setInspectingItem(task)}
                            className="badge-teal"
                            style={{
                              cursor: "pointer",
                              border: "none",
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: 500,
                            }}
                            title="Click to inspect mathematical decision basis"
                          >
                            <span>✓ Task</span>
                            <span>({Math.round((task.is_task_confidence || 0.95) * 100)}%)</span>
                            <span style={{ opacity: 0.6, fontSize: "10px" }}>ⓘ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => promptDeleteTask(task)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--color-muted)",
                              cursor: "pointer",
                              fontSize: "14px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Delete Task"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* TAB: IDEAS & FACTS */}
          {currentView === "ideas" && (
            <>
              {nonTasks.length === 0 ? (
                <div className="claude-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-muted)" }}>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    No ideas or facts saved. Items with is_task &lt; 0.50 are automatically routed here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="desktop-ideas-table claude-card" style={{ padding: 0, overflow: "hidden" }}>
                    <div className="claude-table-container">
                      <table className="claude-table">
                        <thead>
                          <tr>
                            <th>Idea / Fact Note</th>
                            <th style={{ width: "170px" }}>Actionability Score</th>
                            <th style={{ width: "230px" }}>Classification Basis</th>
                            <th style={{ width: "140px", textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nonTasks.map((item) => (
                            <tr key={item.id}>
                              <td style={{ color: "var(--color-body)" }}>{item.text}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setInspectingItem(item)}
                                  className="badge-muted"
                                  style={{
                                    cursor: "pointer",
                                    border: "none",
                                    fontSize: "11px",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontWeight: 500,
                                  }}
                                  title="Click to inspect classification basis"
                                >
                                  <span>💡 Idea ({Math.round((item.is_task_confidence || 0.08) * 100)}%)</span>
                                  <span style={{ opacity: 0.6, fontSize: "10px" }}>ⓘ</span>
                                </button>
                              </td>
                              <td style={{ fontSize: "12px", color: "var(--color-muted)", lineHeight: 1.4 }}>
                                {(item.is_task_confidence || 0) < 0.2
                                  ? "Factual trivia / statement (no actionable intent)"
                                  : "Speculative thought (< 50% action threshold)"}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  onClick={() => handleConvertToTask(item)}
                                  disabled={convertingId === item.id}
                                  className={`btn-secondary ${convertingId === item.id ? "btn-evaluating" : ""}`}
                                  style={{ height: "28px", padding: "0 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                >
                                  {convertingId === item.id ? (
                                    <>
                                      <span className="btn-spinner btn-spinner-coral" style={{ width: "11px", height: "11px" }} />
                                      <span>Converting...</span>
                                    </>
                                  ) : (
                                    <span>Convert to Task →</span>
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Touch Cards View (visible on <= 768px) */}
                  <div className="mobile-ideas-cards">
                    {nonTasks.map((item) => (
                      <div key={item.id} className="mobile-task-card">
                        <p style={{ margin: 0, fontSize: "14px", color: "var(--color-ink)", lineHeight: 1.5, wordBreak: "break-word" }}>
                          {item.text}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setInspectingItem(item)}
                            className="badge-muted"
                            style={{
                              cursor: "pointer",
                              border: "none",
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: 500,
                            }}
                            title="Click to inspect classification basis"
                          >
                            <span>💡 Idea ({Math.round((item.is_task_confidence || 0.08) * 100)}%)</span>
                            <span style={{ opacity: 0.6, fontSize: "10px" }}>ⓘ</span>
                          </button>

                          <button
                            onClick={() => handleConvertToTask(item)}
                            disabled={convertingId === item.id}
                            className={`btn-secondary ${convertingId === item.id ? "btn-evaluating" : ""}`}
                            style={{ height: "30px", padding: "0 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            {convertingId === item.id ? (
                              <>
                                <span className="btn-spinner btn-spinner-coral" style={{ width: "11px", height: "11px" }} />
                                <span>Converting...</span>
                              </>
                            ) : (
                              <span>Convert to Task →</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* TAB: EVALUATION BASIS */}
          {currentView === "basis" && (
            <div className="claude-card" style={{ padding: "28px 24px" }}>
              <div style={{ marginBottom: "24px" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "26px",
                    fontWeight: 400,
                    color: "var(--color-ink)",
                    letterSpacing: "-0.5px",
                    margin: "0 0 6px 0",
                  }}
                >
                  On What Basis Are Notes Evaluated?
                </h2>
                <p style={{ fontSize: "14px", color: "var(--color-body)", maxWidth: "780px", lineHeight: 1.6, margin: 0 }}>
                  Cadence does not use brittle conversational prompting or guesswork. Instead, it questions TypeSafe Jev across discrete mathematical dimensions with calibrated statistical confidence thresholds.
                </p>
              </div>

              {/* Pillars Grid: 2-Column Balanced Cards */}
              <div className="basis-cards-grid">
                {/* 1. is_task */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface-soft)",
                    borderRadius: "var(--radius-lg)",
                    padding: "22px",
                    border: "1px solid var(--color-hairline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      1. Actionability
                    </span>
                    <span className="badge-teal" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                      Threshold ≥ 50%
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.3px" }}>
                    Task Classification Gate
                  </h4>
                  <p style={{ fontSize: "13.5px", color: "var(--color-body)", lineHeight: 1.5, margin: 0, minHeight: "42px", display: "flex", alignItems: "center" }}>
                    <em>&ldquo;Is this note an actionable task for you to complete, rather than a reference thought or fact?&rdquo;</em>
                  </p>
                  <div style={{ fontSize: "12.5px", color: "var(--color-muted)", backgroundColor: "var(--color-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-hairline-soft)", marginTop: "auto", lineHeight: 1.5, minHeight: "92px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div>
                      <strong>Decision Gate:</strong> Notes with actionability probability ≥ 50% enter your Active list. Non-actionable thoughts (ideas, facts, observations) automatically route to <strong>Ideas &amp; Facts</strong>.
                    </div>
                  </div>
                </div>

                {/* 2. priority */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface-soft)",
                    borderRadius: "var(--radius-lg)",
                    padding: "22px",
                    border: "1px solid var(--color-hairline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      2. Urgency Score
                    </span>
                    <span className="badge-coral" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                      Scale: 0.0 → 3.0
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.3px" }}>
                    Calibrated Urgency Rubric
                  </h4>
                  <p style={{ fontSize: "13.5px", color: "var(--color-body)", lineHeight: 1.5, margin: 0, minHeight: "42px", display: "flex", alignItems: "center" }}>
                    <em>&ldquo;How soon must this action be completed relative to your current priorities?&rdquo;</em>
                  </p>
                  <div style={{ fontSize: "12.5px", color: "var(--color-muted)", backgroundColor: "var(--color-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-hairline-soft)", marginTop: "auto", lineHeight: 1.5, minHeight: "92px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
                      <div><strong>3.0:</strong> Urgent (Due today)</div>
                      <div><strong>2.0:</strong> Days (Next 2–3 days)</div>
                      <div><strong>1.0:</strong> Weeks (Upcoming)</div>
                      <div><strong>0.0:</strong> Someday (No rush)</div>
                    </div>
                  </div>
                </div>

                {/* 3. deadline */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface-soft)",
                    borderRadius: "var(--radius-lg)",
                    padding: "22px",
                    border: "1px solid var(--color-hairline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      3. Calendar Dates
                    </span>
                    <span className="badge-teal" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                      Confidence ≥ 70%
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.3px" }}>
                    Zero-Hallucination Deadlines
                  </h4>
                  <p style={{ fontSize: "13.5px", color: "var(--color-body)", lineHeight: 1.5, margin: 0, minHeight: "42px", display: "flex", alignItems: "center" }}>
                    <em>&ldquo;What is the explicit deadline date referenced in the note text?&rdquo;</em>
                  </p>
                  <div style={{ fontSize: "12.5px", color: "var(--color-muted)", backgroundColor: "var(--color-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-hairline-soft)", marginTop: "auto", lineHeight: 1.5, minHeight: "92px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div>
                      <strong>Zero-Hallucination Rule:</strong> Relative dates (e.g. &ldquo;by Friday&rdquo;) are resolved to exact dates. If confidence is below 70%, the date is left empty to prevent phantom deadlines.
                    </div>
                  </div>
                </div>

                {/* 4. Personal Autonomy */}
                <div
                  style={{
                    backgroundColor: "var(--color-surface-soft)",
                    borderRadius: "var(--radius-lg)",
                    padding: "22px",
                    border: "1px solid var(--color-hairline)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      4. Solo Autonomy
                    </span>
                    <span className="badge-teal" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                      Direct Action
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.3px" }}>
                    Unencumbered Solo Focus
                  </h4>
                  <p style={{ fontSize: "13.5px", color: "var(--color-body)", lineHeight: 1.5, margin: 0, minHeight: "42px", display: "flex", alignItems: "center" }}>
                    <em>&ldquo;Are all tasks under your immediate personal execution and control?&rdquo;</em>
                  </p>
                  <div style={{ fontSize: "12.5px", color: "var(--color-muted)", backgroundColor: "var(--color-canvas)", padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-hairline-soft)", marginTop: "auto", lineHeight: 1.5, minHeight: "92px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div>
                      <strong>Personal Flow:</strong> Third-party blockers and waiting bottlenecks are eliminated. All actions save directly to your live MongoDB Atlas cloud database.
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipeline Config Showcase */}
              <div className="claude-card-dark" style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-surface-dark-elevated)", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#ff5f56" }} />
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#27c93f" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-on-dark-soft)", marginLeft: "6px" }}>
                      config.py • Calibrated Parameters
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-accent-teal)" }}>
                    deterministic pipeline
                  </span>
                </div>
                <pre style={{ fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.7, color: "var(--color-on-dark)", overflowX: "auto", margin: 0 }}>
{`MODEL_NAME = "jev-latest"

IS_TASK_MIN = 0.50              # Below 0.50 -> Routed to 'Ideas & Facts'
DEADLINE_CONFIDENCE_MIN = 0.70  # Below 0.70 -> Left blank to prevent false dates
MODE = "solo_personal"          # Direct execution synchronized with MongoDB Atlas`}
                </pre>
              </div>

              {/* Real World Benchmark Examples Table */}
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "20px",
                    fontWeight: 500,
                    color: "var(--color-ink)",
                    margin: "0 0 12px 0",
                  }}
                >
                  Real-World Evaluation Benchmark Examples
                </h3>
                <div className="claude-table-container">
                  <table className="claude-table">
                    <thead>
                      <tr>
                        <th>Raw Note Snippet</th>
                        <th style={{ width: "130px" }}>is_task</th>
                        <th style={{ width: "140px" }}>Priority</th>
                        <th style={{ width: "130px" }}>Deadline</th>
                        <th style={{ width: "180px" }}>Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ color: "var(--color-ink)" }}>&ldquo;Deploy hotfix for login session before 2pm&rdquo;</td>
                        <td><span className="badge-teal">0.98 (Task)</span></td>
                        <td><strong style={{ color: "var(--color-primary)" }}>Urgent (3.0)</strong></td>
                        <td>Today</td>
                        <td><strong style={{ color: "#2e7559" }}>Active / Urgent</strong></td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--color-ink)" }}>&ldquo;Draft architectural blueprint by Friday&rdquo;</td>
                        <td><span className="badge-teal">0.95 (Task)</span></td>
                        <td><strong>Days (2.0)</strong></td>
                        <td>Friday</td>
                        <td><strong style={{ color: "#2e7559" }}>Active / Scheduled</strong></td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--color-ink)" }}>&ldquo;Remember that photosynthesis happens in chloroplasts&rdquo;</td>
                        <td><span className="badge-muted">0.08 (&lt; 0.50)</span></td>
                        <td>Someday (0.0)</td>
                        <td>None</td>
                        <td><strong style={{ color: "var(--color-muted)" }}>Ideas &amp; Facts</strong></td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--color-ink)" }}>&ldquo;Order new ergonomic mouse wrist rest&rdquo;</td>
                        <td><span className="badge-teal">0.89 (Task)</span></td>
                        <td>Weeks (1.0)</td>
                        <td>None</td>
                        <td><strong style={{ color: "#2e7559" }}>Active Tasks</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          3. DELETE CONFIRMATION MODAL
          ========================================================================= */}
      {taskToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(24, 23, 21, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTaskToDelete(null);
          }}
        >
          <div className="claude-modal-box" style={{ maxWidth: "430px" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                backgroundColor: "#c44d3c",
              }}
            />

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(196, 77, 60, 0.1)",
                  color: "#c44d3c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                🗑
              </div>
              <div>
                <h3
                  id="delete-modal-title"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "20px",
                    fontWeight: 500,
                    margin: "0 0 4px 0",
                    color: "var(--color-ink)",
                  }}
                >
                  Delete Task?
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--color-muted)", margin: 0, lineHeight: 1.4 }}>
                  Are you sure you want to delete this task? This action will remove it from your MongoDB database.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "6px",
                backgroundColor: "var(--color-surface-soft)",
                border: "1px solid var(--color-hairline)",
                marginBottom: "20px",
                fontSize: "13px",
                color: "var(--color-ink)",
                fontStyle: "italic",
                maxHeight: "75px",
                overflowY: "auto",
              }}
            >
              &ldquo;{taskToDelete.text}&rdquo;
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="btn-secondary"
                style={{ height: "36px", padding: "0 14px", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                style={{
                  height: "36px",
                  padding: "0 16px",
                  backgroundColor: "#c44d3c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Delete Task
              </button>
            </div>
          </div>
          <style jsx>{`
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.96);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}
      {/* =========================================================================
          4. EVALUATION BASIS & SCORE INSPECTION MODAL
          ========================================================================= */}
      {inspectingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(24, 23, 21, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingItem(null);
          }}
        >
          <div className="claude-modal-box">
            {/* Top Accent Strip */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                backgroundColor: inspectingItem.is_task !== false ? "#2e7559" : "var(--color-primary)",
              }}
            />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: inspectingItem.is_task !== false ? "rgba(46, 117, 89, 0.1)" : "rgba(204, 120, 92, 0.12)",
                  color: inspectingItem.is_task !== false ? "#2e7559" : "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "17px",
                  flexShrink: 0,
                }}
              >
                ⚖
              </div>
              <div>
                <h3
                  id="inspect-modal-title"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "20px",
                    fontWeight: 600,
                    margin: "0 0 2px 0",
                    color: "var(--color-ink)",
                  }}
                >
                  Decision Basis &amp; Score
                </h3>
                <p style={{ fontSize: "12.5px", color: "var(--color-muted)", margin: 0 }}>
                  Mathematical classification generated by TypeSafe Jev model
                </p>
              </div>
            </div>

            {/* Note Snippet */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "var(--color-surface-soft)",
                border: "1px solid var(--color-hairline)",
                marginBottom: "16px",
                fontSize: "13.5px",
                color: "var(--color-ink)",
                fontStyle: "italic",
                lineHeight: 1.4,
              }}
            >
              &ldquo;{inspectingItem.text}&rdquo;
            </div>

            {/* Classification Verdict Banner */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: inspectingItem.is_task !== false ? "rgba(46, 117, 89, 0.08)" : "rgba(108, 106, 100, 0.08)",
                border: `1px solid ${inspectingItem.is_task !== false ? "rgba(46, 117, 89, 0.25)" : "rgba(108, 106, 100, 0.25)"}`,
                marginBottom: "18px",
                fontSize: "12.5px",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: inspectingItem.is_task !== false ? "#2e7559" : "var(--color-ink)" }}>
                {inspectingItem.is_task !== false ? "✓ Classified as Actionable Task" : "💡 Classified as Idea / Fact"}
              </strong>
              <div style={{ color: "var(--color-body)", marginTop: "2px" }}>
                {inspectingItem.is_task !== false
                  ? `Actionability confidence of ${Math.round((inspectingItem.is_task_confidence || 0.95) * 100)}% met or exceeded the 50% decision gate, routing this item to your active execution list.`
                  : `Actionability confidence of ${Math.round((inspectingItem.is_task_confidence || 0.08) * 100)}% fell below the 50% threshold. Jev routed this item to Ideas & Facts so it does not clutter your daily to-dos.`}
              </div>
            </div>

            {/* 3 Metric Breakdown Cards */}
            <div className="inspect-metrics-grid">
              {/* Metric 1: Actionability */}
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-surface-soft)",
                  border: "1px solid var(--color-hairline)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-muted)", fontWeight: 600 }}>
                  Actionability
                </span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>
                  {Math.round((inspectingItem.is_task_confidence || (inspectingItem.is_task !== false ? 0.95 : 0.08)) * 100)}%
                </span>
                <span style={{ fontSize: "10.5px", color: inspectingItem.is_task !== false ? "#2e7559" : "var(--color-muted)" }}>
                  {inspectingItem.is_task !== false ? "≥ 50% (Passed)" : "< 50% (Idea)"}
                </span>
              </div>

              {/* Metric 2: Urgency Score */}
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-surface-soft)",
                  border: "1px solid var(--color-hairline)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-muted)", fontWeight: 600 }}>
                  Urgency Score
                </span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                  {inspectingItem.priority_score ? inspectingItem.priority_score.toFixed(1) : (inspectingItem.is_task === false ? "0.0" : "2.0")}
                  <span style={{ fontSize: "11px", color: "var(--color-muted)", fontWeight: 400 }}> / 3.0</span>
                </span>
                <span style={{ fontSize: "10.5px", color: "var(--color-ink)", fontWeight: 500 }}>
                  {inspectingItem.priority_label || (inspectingItem.is_task === false ? "Someday" : "Days")}
                </span>
              </div>

              {/* Metric 3: Deadline */}
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-surface-soft)",
                  border: "1px solid var(--color-hairline)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-muted)", fontWeight: 600 }}>
                  Deadline Date
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {inspectingItem.deadline || "None"}
                </span>
                <span style={{ fontSize: "10.5px", color: "var(--color-muted)" }}>
                  {inspectingItem.deadline ? "≥ 70% Confidence" : "No false date"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {inspectingItem.is_task === false && (
                <button
                  type="button"
                  onClick={() => {
                    handleConvertToTask(inspectingItem);
                    setInspectingItem(null);
                  }}
                  disabled={convertingId === inspectingItem.id}
                  className={`btn-primary ${convertingId === inspectingItem.id ? "btn-evaluating" : ""}`}
                  style={{ height: "36px", padding: "0 14px", fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {convertingId === inspectingItem.id ? (
                    <>
                      <span className="btn-spinner" style={{ width: "12px", height: "12px" }} />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <span>Convert to Task →</span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="btn-secondary"
                style={{ height: "36px", padding: "0 16px", fontSize: "12.5px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
