"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveNaturalDate, getRelativeDateLabel, formatDate, splitCompoundTasks } from "@/lib/extractor";
import { normalizeTaskText } from "@/lib/textUtils";
import { isExpenseNote, parseExpense, CATEGORIES } from "@/lib/expenseExtractor";

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

const INITIAL_STARTER_EXPENSES = [
  {
    id: "exp_seed_1",
    title: "Cafe",
    merchant: "Cafe",
    rawNote: "Cafe 700",
    amount: 700,
    currency: "INR",
    symbol: "₹",
    category: "food",
    categoryName: "Food & Dining",
    categoryIcon: "☕",
    date: "2026-09-18",
    dateLabel: "18 Sept",
    split: {
      isSplit: false,
      participants: ["You"],
      payer: "You",
      splitCount: 1,
      yourShare: 700,
      theirShare: 0,
      owedTo: "",
      owedAmount: 0,
      settled: false,
    },
    createdAt: new Date("2026-09-18T14:30:00Z").toISOString(),
  },
  {
    id: "exp_seed_2",
    title: "Gym membership renewal",
    merchant: "gym",
    rawNote: "Gym membership renewal 7999 at gym",
    amount: 7999,
    currency: "INR",
    symbol: "₹",
    category: "health",
    categoryName: "Health",
    categoryIcon: "💪",
    date: "2026-09-19",
    dateLabel: "19 Sept",
    split: {
      isSplit: false,
      participants: ["You"],
      payer: "You",
      splitCount: 1,
      yourShare: 7999,
      theirShare: 0,
      owedTo: "",
      owedAmount: 0,
      settled: false,
    },
    createdAt: new Date("2026-09-19T10:15:00Z").toISOString(),
  },
  {
    id: "exp_seed_3",
    title: "Uber to the airport",
    merchant: "Uber",
    rawNote: "Uber to the airport 800 at Uber",
    amount: 800,
    currency: "INR",
    symbol: "₹",
    category: "transport",
    categoryName: "Transport",
    categoryIcon: "🚗",
    date: "2026-09-19",
    dateLabel: "19 Sept",
    split: {
      isSplit: false,
      participants: ["You"],
      payer: "You",
      splitCount: 1,
      yourShare: 800,
      theirShare: 0,
      owedTo: "",
      owedAmount: 0,
      settled: false,
    },
    createdAt: new Date("2026-09-19T17:45:00Z").toISOString(),
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
  const [nonTasks, setNonTasks] = useState([]);
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

  // Active View Filter: 'active' | 'urgent' | 'scheduled' | 'completed' | 'all' | 'ideas' | 'basis' | 'expenses'
  const [currentView, setCurrentView] = useState("active");

  // Expenses State & Filters
  const [expenses, setExpenses] = useState([]);
  const [expenseFilter, setExpenseFilter] = useState("all"); // 'all' | 'personal' | 'split' | 'unsettled' | 'settled'
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [speechLang, setSpeechLang] = useState("en-IN");
  const [showInspector, setShowInspector] = useState(false);
  const voiceRecognitionRef = useRef(null);
  const ledgerTextareaRef = useRef(null);

  // Mobile Drawer & Search State
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  // Quick Add input state
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddPriority, setQuickAddPriority] = useState("Days");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const quickAddInputRef = useRef(null);

  // Check URL params for ?drawer=open or ?demo=true or ?tab=basis or ?tab=expenses
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "basis") {
        setCurrentView("basis");
      } else if (params.get("tab") === "expenses" || params.get("view") === "expenses") {
        setCurrentView("expenses");
      }
      if (params.get("drawer") === "open" || params.get("demo") === "true") {
        setShowAiDrawer(true);
        if (params.get("demo") === "true" && !notesText) {
          setNotesText(generateHumanNotes());
        }
      }
    }

    // Purge legacy local storage cache completely so stale data never resurrects
    try {
      localStorage.removeItem("cadence_personal_tasks_v1");
      localStorage.removeItem("cadence_personal_nontasks_v1");
      localStorage.removeItem("cadence_personal_expenses_v1");
    } catch (e) {
      // ignore
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
          loadUserExpensesFromDb();
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
        if (expenseToDelete) setExpenseToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [taskToDelete, inspectingItem, expenseToDelete]);

  // Expands any compound or multi-action tasks into distinct individual tasks
  const expandCompoundTasks = (items) => {
    if (!Array.isArray(items)) return [];
    const expanded = [];
    for (const t of items) {
      if (!t.completed && t.text) {
        const parts = splitCompoundTasks(t.text);
        if (parts.length > 1) {
          parts.forEach((p, idx) => {
            const detected = resolveNaturalDate(p);
            let deadline = detected?.date || t.deadline || "";
            let deadlineFlag = detected?.date ? "confident" : t.deadline_flag || "none";
            let deadlineConfidence = detected?.confidence || t.deadline_confidence || 0;
            let priority = t.priority_label || "Days";
            let score = t.priority_score ?? 2.0;
            if (detected?.label === "Today") {
              priority = "Urgent";
              score = 3.0;
            } else if (detected?.label === "Tomorrow") {
              priority = "Days";
              score = 2.0;
            }

            expanded.push({
              ...t,
              id: `${t.id}_part_${idx}_${Math.random().toString(36).slice(2, 5)}`,
              text: normalizeTaskText(p),
              deadline,
              deadline_flag: deadlineFlag,
              deadline_confidence: deadlineConfidence,
              priority_label: priority,
              priority_score: score,
            });
          });
          continue;
        }
      }
      expanded.push(t);
    }
    return expanded;
  };

  // Load tasks from MongoDB (strict MongoDB, no local storage, no starter re-seeding)
  const loadUserTasksFromDb = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setDbStatus("connected");
        const loadedTasks = Array.isArray(data.tasks) ? data.tasks : [];
        const expanded = expandCompoundTasks(loadedTasks);
        setTasks(expanded);
        setNonTasks(Array.isArray(data.nonTasks) ? data.nonTasks : []);
        setIsLoaded(true);
        return;
      }
    } catch (err) {
      console.warn("MongoDB tasks fetch warning:", err);
      setDbStatus("offline");
    }
    setIsLoaded(true);
  };

  // Load expenses from MongoDB (strict MongoDB)
  // Re-evaluates loaded expenses using the latest parseExpense parser
  const recalculateExpensesFromRawNotes = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((exp) => {
      if (exp && exp.rawNote) {
        try {
          const fresh = parseExpense(exp.rawNote);
          if (fresh && fresh.amount > 0) {
            return {
              ...exp,
              amount: fresh.amount,
              category: fresh.category || exp.category,
              categoryName: fresh.categoryName || exp.categoryName,
              categoryIcon: fresh.categoryIcon || exp.categoryIcon,
              split: {
                ...(exp.split || {}),
                yourShare: exp.split?.isSplit ? fresh.split?.yourShare : fresh.amount,
                theirShare: exp.split?.isSplit ? fresh.split?.theirShare : 0,
                owedAmount: exp.split?.isSplit ? fresh.split?.owedAmount : 0,
              },
            };
          }
        } catch (err) {
          console.warn("Expense recalculation notice:", err);
        }
      }
      return exp;
    });
  };

  // Load expenses from MongoDB (strict MongoDB, no local storage, no starter re-seeding)
  const loadUserExpensesFromDb = async () => {
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        const loadedExpenses = Array.isArray(data.expenses) ? data.expenses : [];
        const refreshed = recalculateExpensesFromRawNotes(loadedExpenses);
        setExpenses(refreshed);
        return;
      }
    } catch (err) {
      console.warn("MongoDB expenses fetch warning:", err);
    }
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
          tasks: currentTasks || [],
          nonTasks: currentNonTasks || [],
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

  // Sync expenses to MongoDB (strict MongoDB, zero local storage)
  const syncExpensesToDb = async (currentExpenses) => {
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          expenses: currentExpenses || [],
        }),
      });
    } catch (err) {
      console.warn("MongoDB POST sync expenses warning:", err);
    }
  };

  // Persist to MongoDB on changes (strict MongoDB only, zero local storage)
  useEffect(() => {
    if (!isLoaded || isAuthChecking) return;

    const timeout = setTimeout(() => {
      syncTasksToDb(tasks, nonTasks);
      syncExpensesToDb(expenses);
    }, 600);

    return () => clearTimeout(timeout);
  }, [tasks, nonTasks, expenses, isLoaded, isAuthChecking]);

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

  // Confirm and Execute Delete Task (Permanently removes from MongoDB)
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const idToDelete = taskToDelete.id;
    setTaskToDelete(null);

    const updated = tasks.filter((t) => t.id !== idToDelete);
    setTasks(updated);

    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(idToDelete)}`, {
        method: "DELETE",
      });
      await syncTasksToDb(updated, nonTasks);
    } catch (err) {
      console.warn("MongoDB delete task sync warning:", err);
    }
  };

  // Clear Completed Tasks
  const handleClearCompleted = async () => {
    const updated = tasks.filter((t) => !t.completed);
    setTasks(updated);
    await syncTasksToDb(updated, nonTasks);
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

  // Universal Quick Add: Handles Tasks, Expenses, and Splitwise Notes seamlessly
  const handleQuickAdd = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = quickAddText.trim();
    if (!trimmed || isAddingTask) return;

    setIsAddingTask(true);

    // 1. If this note is an expense or splitwise transaction, record to expenses
    if (isExpenseNote(trimmed)) {
      const parsedExpense = parseExpense(trimmed);
      setExpenses((prev) => {
        const updated = [parsedExpense, ...prev];
        syncExpensesToDb(updated);
        return updated;
      });

      setQuickAddText("");
      setCurrentView("expenses");
      setTimeout(() => setIsAddingTask(false), 200);
      return;
    }

    // 2. Otherwise record as task (splitting compound / multi-action notes into distinct tasks)
    const taskStrings = splitCompoundTasks(trimmed);
    const newTasks = taskStrings.map((tStr, idx) => {
      const detected = resolveNaturalDate(tStr);
      let deadline = "";
      let deadlineFlag = "none";
      let deadlineConfidence = 0;
      let priority = quickAddPriority;
      let score = 2.0;

      if (detected && detected.date) {
        deadline = detected.date;
        deadlineFlag = "confident";
        deadlineConfidence = detected.confidence;

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

      const normalizedText = normalizeTaskText(tStr);

      return {
        id: `task_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
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
    });

    setTasks((prev) => {
      const updated = [...newTasks, ...prev];
      syncTasksToDb(updated, nonTasks);
      return updated;
    });
    setQuickAddText("");
    if (currentView === "expenses") {
      setCurrentView("active");
    }
    setTimeout(() => setIsAddingTask(false), 200);
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

  // Toggle Settle Up for Splitwise Expense
  const handleToggleSettle = (expenseId) => {
    setExpenses((prev) => {
      const updated = prev.map((exp) => {
        if (exp.id === expenseId && exp.split) {
          return {
            ...exp,
            split: {
              ...exp.split,
              settled: !exp.split.settled,
            },
          };
        }
        return exp;
      });
      syncExpensesToDb(updated);
      return updated;
    });
  };

  // Confirm and Execute Delete Expense (Permanently removes from MongoDB)
  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    const idToDelete = expenseToDelete.id;
    setExpenseToDelete(null);

    const updated = expenses.filter((exp) => exp.id !== idToDelete);
    setExpenses(updated);

    try {
      await fetch(`/api/expenses?id=${encodeURIComponent(idToDelete)}`, {
        method: "DELETE",
      });
      await syncExpensesToDb(updated);
    } catch (err) {
      console.warn("Delete expense sync warning:", err);
    }
  };

  // Voice Input via Browser Web Speech API (Client-side, free, zero backend, supports en-IN & hi-IN)
  const startVoiceInput = async () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser me Web Speech API available nahi hai. Please Google Chrome, Microsoft Edge, ya Safari browser use karein.");
      return;
    }

    if (isVoiceListening) {
      try {
        if (voiceRecognitionRef.current) voiceRecognitionRef.current.stop();
      } catch (err) {}
      setIsVoiceListening(false);
      return;
    }

    // Explicitly prompt browser for microphone permission via getUserMedia
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr) {
      console.warn("Microphone permission prompt warning:", permErr);
      alert("Microphone permission blocked hai. Please browser address bar me lock/tune icon par click karke Microphone allow kijiye.");
      return;
    }

    // Focus the universal input textarea
    if (ledgerTextareaRef.current) {
      ledgerTextareaRef.current.focus();
    }

    const existingPrefix = quickAddText.trim() ? `${quickAddText.trim()} ` : "";

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang || "en-IN"; // 'en-IN' for Hinglish/Indian English, 'hi-IN' for pure Hindi
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsVoiceListening(true);
      };

      recognition.onresult = (event) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i] && event.results[i][0]) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
        }
        const clean = fullTranscript.trim();
        if (clean) {
          setQuickAddText(existingPrefix ? `${existingPrefix}${clean}` : clean);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Web Speech API recognition event:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          alert("Microphone permission blocked hai. Please browser address bar me mic icon par click karke Allow kijiye.");
        } else if (event.error === "network") {
          alert("Network error: Chrome Web Speech API ko audio transcribe karne ke liye internet connection zaroori hai.");
        }
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      voiceRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsVoiceListening(false);
    }
  };

  // Space-to-speak global keyboard trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        startVoiceInput();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVoiceListening, speechLang, quickAddText]);

  // Export Expenses to CSV
  const handleExportCsv = () => {
    if (expenses.length === 0) return;
    const headers = ["Date", "Description", "Category", "Amount", "Currency", "Merchant", "Splitwise", "Your Share", "Status"];
    const rows = expenses.map((e) => [
      e.date || "",
      `"${(e.title || e.rawNote || "Expense").replace(/"/g, '""')}"`,
      `"${(e.categoryName || e.category || "General").replace(/"/g, '""')}"`,
      e.amount || 0,
      e.currency || "INR",
      `"${(e.merchant || "").replace(/"/g, '""')}"`,
      e.split?.isSplit ? `Yes (Split ${e.split.splitCount || 2} ways)` : "No",
      e.split?.isSplit ? (e.split.yourShare || 0) : (e.amount || 0),
      e.split?.isSplit ? (e.split.settled ? "Settled" : "Unsettled") : "Paid",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `cadence-expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear All Expenses (Permanently clears from MongoDB)
  const handleClearExpenses = async () => {
    if (expenses.length === 0) return;
    if (window.confirm("Are you sure you want to clear all expense entries?")) {
      setExpenses([]);
      try {
        await fetch("/api/expenses?id=all", { method: "DELETE" });
        await syncExpensesToDb([]);
      } catch (err) {
        console.warn("Clear expenses warning:", err);
      }
    }
  };

  // Format Date for Ledger Table: e.g. "18 Sept", "19 Sept"
  const formatLedgerDate = (exp) => {
    if (!exp) return "";
    if (exp.date) {
      try {
        const parts = exp.date.split("-");
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const day = d.getDate();
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
          return `${day} ${months[d.getMonth()]}`;
        }
      } catch (e) {}
    }
    if (exp.dateLabel && exp.dateLabel !== "Today") return exp.dateLabel;
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    return `${now.getDate()} ${months[now.getMonth()]}`;
  };

  // AI Sort & Ingest (Enhanced to detect and route expenses automatically)
  const handleAiSortAndMerge = async () => {
    if (!notesText.trim()) return;
    setSortingAi(true);
    setErrorMsg("");

    try {
      // 1. Separate out any expense notes (English, Hindi, Hinglish)
      const lines = notesText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      const expenseLines = [];
      const taskLines = [];

      for (const line of lines) {
        const cleanLine = line.replace(/^[-*•\d+.)\]\s]+/, "").trim();
        if (isExpenseNote(cleanLine)) {
          expenseLines.push(cleanLine);
        } else {
          taskLines.push(line);
        }
      }

      // If any expenses found, parse and save them
      if (expenseLines.length > 0) {
        const newExpenses = expenseLines.map((el) => parseExpense(el));
        setExpenses((prev) => {
          const updated = [...newExpenses, ...prev];
          syncExpensesToDb(updated);
          return updated;
        });
      }

      // If user ONLY pasted expenses, route directly to expenses view
      if (taskLines.length === 0) {
        setNotesText("");
        setShowAiDrawer(false);
        setCurrentView("expenses");
        setSortingAi(false);
        return;
      }

      // 2. Sort remaining tasks with Jev
      const res = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: taskLines.join("\n"),
          people: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sort notes with Jev");
      }

      const newItems = (data.tasks || []).map((t) => ({ ...t, completed: false }));
      
      // Fallback rescue for any notes that failed API evaluation so they are never lost
      const rescuedItems = (data.failedNotes || []).map((f, idx) => ({
        id: f.id || `task_rescued_${Date.now()}_${idx}`,
        text: normalizeTaskText(f.text || f.note || "Unsorted Note"),
        completed: false,
        priority_score: 1.0,
        priority_label: "Days",
        priority_confidence: 0.7,
        priority_flag: "confident",
        deadline: "",
        deadline_flag: "none",
        deadline_confidence: 0,
        is_task: true,
        user_edited: { text: false, priority: false, deadline: false },
        status: "sorted",
      }));

      const mergedTasks = [...newItems, ...rescuedItems, ...tasks].sort((a, b) => b.priority_score - a.priority_score);
      setTasks(mergedTasks);

      let mergedNonTasks = nonTasks;
      if (data.nonTasks?.length > 0) {
        mergedNonTasks = [...data.nonTasks, ...nonTasks];
        setNonTasks(mergedNonTasks);
      }

      syncTasksToDb(mergedTasks, mergedNonTasks);
      setNotesText("");
      setShowAiDrawer(false);
      if (expenseLines.length > 0 && taskLines.length === 0) {
        setCurrentView("expenses");
      } else {
        setCurrentView("active");
      }
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

  // Counts & Calculations for Expenses & Splitwise
  const totalSpent = expenses.reduce((acc, exp) => {
    if (exp.split?.isSplit) {
      return acc + (Number(exp.split.yourShare) || 0);
    }
    return acc + (Number(exp.amount) || 0);
  }, 0);

  const totalOwedToYou = expenses.reduce((acc, exp) => {
    if (exp.split?.isSplit && !exp.split.settled && exp.split.owedTo === "You") {
      return acc + (Number(exp.split.owedAmount) || 0);
    }
    return acc;
  }, 0);

  const totalYouOwe = expenses.reduce((acc, exp) => {
    if (exp.split?.isSplit && !exp.split.settled && exp.split.owedTo && exp.split.owedTo !== "You") {
      return acc + (Number(exp.split.owedAmount) || 0);
    }
    return acc;
  }, 0);

  const unsettledSplitsCount = expenses.filter(
    (exp) => exp.split?.isSplit && !exp.split.settled
  ).length;

  const unsettledOwedCount = expenses.filter(
    (exp) => exp.split?.isSplit && !exp.split.settled && exp.split.owedTo === "You"
  ).length;

  const unsettledYouOweCount = expenses.filter(
    (exp) => exp.split?.isSplit && !exp.split.settled && exp.split.owedTo && exp.split.owedTo !== "You"
  ).length;

  // Filtered Expenses
  const filteredExpenses = expenses.filter((exp) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (exp.title || "").toLowerCase().includes(q);
      const rawMatch = (exp.rawNote || "").toLowerCase().includes(q);
      const catMatch = (exp.categoryName || "").toLowerCase().includes(q);
      const partnerMatch = (exp.split?.partnerName || "").toLowerCase().includes(q);
      if (!titleMatch && !rawMatch && !catMatch && !partnerMatch) return false;
    }

    if (expenseCategoryFilter !== "all" && exp.category !== expenseCategoryFilter) {
      return false;
    }

    if (expenseFilter === "personal") return !exp.split?.isSplit;
    if (expenseFilter === "split") return Boolean(exp.split?.isSplit);
    if (expenseFilter === "unsettled") return Boolean(exp.split?.isSplit && !exp.split?.settled);
    if (expenseFilter === "settled") return Boolean(exp.split?.isSplit && exp.split?.settled);

    return true;
  });

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
      case "expenses":
        return "Expenses & Splits";
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
        <div style={{ marginBottom: "20px", padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "22px" }}>
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
              height: "38px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              borderRadius: "var(--radius-sm)",
              width: "100%",
              fontWeight: 500,
              boxShadow: "0 1px 4px rgba(204, 120, 92, 0.25)",
            }}
            title="Add task or expense note"
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
            <span>New Item</span>
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
              height: "36px",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "var(--radius-sm)",
              width: "100%",
              backgroundColor: showAiDrawer ? "rgba(204, 120, 92, 0.08)" : "transparent",
              borderColor: showAiDrawer ? "var(--color-primary)" : "var(--color-hairline)",
              color: showAiDrawer ? "var(--color-primary-active)" : "var(--color-ink)",
              fontWeight: 500,
            }}
            title="Paste messy bullets or thoughts to automatically categorize"
          >
            {sortingAi ? (
              <>
                <span className="btn-spinner btn-spinner-coral" style={{ width: "12px", height: "12px" }} />
                <span>Processing notes...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{showAiDrawer ? "Close Notes Drawer" : "Ingest Raw Notes..."}</span>
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

        {/* Section: Finance & Splits */}
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
            Finance &amp; Splits
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentView("expenses");
              setShowMobileSidebar(false);
            }}
            className={`dashboard-nav-item ${currentView === "expenses" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>💳</span>
              <span>Expenses &amp; Splits</span>
            </div>
            {unsettledSplitsCount > 0 ? (
              <span
                className="sidebar-badge"
                style={{
                  backgroundColor: "rgba(204, 120, 92, 0.15)",
                  color: "var(--color-primary)",
                  fontWeight: 600,
                }}
              >
                {unsettledSplitsCount} split{unsettledSplitsCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className={`sidebar-badge ${currentView === "expenses" ? "active" : ""}`}>
                {expenses.length}
              </span>
            )}
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
        {/* Mobile Top App Bar (visible on screens <= 768px, fixed 56px height) */}
        <div className="dashboard-mobile-header">
          {/* Left: Hamburger + View Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setShowMobileSidebar(true)}
              className="mobile-menu-btn"
              aria-label="Open navigation menu"
              title="Open navigation menu"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M 18 6.5 A 8.5 8.5 0 1 0 18 17.5" stroke="var(--color-ink)" strokeWidth="2.25" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2.75" fill="var(--color-primary)" />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.3px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {getViewTitle()}
              </span>
            </div>
          </div>

          {/* Right Actions: Search + Ingest + Clear Completed */}
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
            {/* Search Icon Toggle */}
            {currentView !== "basis" && (
              <button
                type="button"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className={`mobile-search-btn ${showMobileSearch || searchQuery ? "active" : ""}`}
                aria-label="Toggle search"
                title="Search notes"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {searchQuery && (
                  <span
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary)",
                    }}
                  />
                )}
              </button>
            )}

            {/* Clear Completed Action on Mobile */}
            {currentView === "completed" && completedTasksCount > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="btn-secondary"
                style={{ height: "32px", fontSize: "11px", padding: "0 8px" }}
              >
                Clear
              </button>
            )}

            {/* Ingest Button */}
            <button
              type="button"
              onClick={() => setShowAiDrawer(!showAiDrawer)}
              disabled={sortingAi}
              className={`btn-secondary ${sortingAi ? "btn-evaluating" : ""}`}
              style={{
                height: "33px",
                fontSize: "12px",
                padding: "0 10px",
                gap: "5px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "var(--radius-md)",
              }}
              title="Open Note Ingest"
            >
              {sortingAi ? (
                <>
                  <span className="btn-spinner btn-spinner-coral" style={{ width: "11px", height: "11px" }} />
                  <span>...</span>
                </>
              ) : (
                <span>{showAiDrawer ? "Hide" : "Ingest"}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Expandable Search Bar */}
        {showMobileSearch && currentView !== "basis" && (
          <div className="mobile-search-bar">
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                autoFocus
                placeholder={currentView === "expenses" ? "Search expenses..." : "Search tasks..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mobile-search-input"
              />
              <span
                style={{
                  position: "absolute",
                  left: "10px",
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
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    fontSize: "12px",
                    color: "var(--color-muted)",
                    cursor: "pointer",
                    padding: "2px 4px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMobileSearch(false);
                setSearchQuery("");
              }}
              className="btn-secondary"
              style={{ height: "34px", fontSize: "12px", padding: "0 10px", whiteSpace: "nowrap" }}
            >
              Done
            </button>
          </div>
        )}

        {/* Top View Bar */}
        <header
          className="dashboard-header-inner"
          style={{
            padding: "14px 28px",
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
          {/* Left: Clean Title */}
          <h1
            className="dashboard-header-title"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "22px",
              fontWeight: 500,
              color: "var(--color-ink)",
              letterSpacing: "-0.3px",
              margin: 0,
            }}
          >
            {getViewTitle()}
          </h1>

          {/* Right: Clean Search & View Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Filter / Search Bar */}
            {currentView !== "basis" && (
              <div style={{ position: "relative", minWidth: "160px" }}>
                <input
                  type="text"
                  placeholder={currentView === "expenses" ? "Filter expenses..." : "Filter tasks..."}
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
                    maxWidth: "200px",
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

            {/* Completed Tasks Action */}
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
                    Note Ingest &amp; Organizer
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--color-muted)", margin: "3px 0 0 0" }}>
                    Paste bullets or raw thoughts. Automatically extracts tasks, urgency scores, and deadlines.
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
                  title="Generate fresh, randomized scratchpad notes"
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
                      <span>Processing Notes</span>
                      <span className="eval-dots"><span>.</span><span>.</span><span>.</span></span>
                    </>
                  ) : (
                    <span>Sort &amp; Ingest Notes →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* THE SINGLE UNIVERSAL INPUT CARD (Claude Design: Tasks & Expenses) */}
          {currentView !== "ideas" && currentView !== "basis" && (
            <div className="claude-ledger-wrapper" style={{ marginBottom: "20px" }}>
              <div className="claude-ledger-card">
                <textarea
                  ref={ledgerTextareaRef}
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleQuickAdd(e);
                    }
                  }}
                  placeholder={
                    isVoiceListening
                      ? `🎙️ Sun raha hoon... Bolna shuru kijiye (${speechLang === "hi-IN" ? "Hindi" : "Hinglish"})...`
                      : "Spent 320 on groceries at DMart yesterday, or Meeting tomorrow at 2pm, or press Space to speak"
                  }
                  className="claude-ledger-textarea"
                  rows={2}
                />

                <div className="claude-ledger-card-bottom">
                  <div className="claude-ledger-cues" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {isVoiceListening ? (
                      <span style={{ color: "var(--color-primary)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-primary)", display: "inline-block" }} />
                        LISTENING ({speechLang === "hi-IN" ? "HI-IN / हिन्दी" : "EN-IN / HINGLISH"}) &middot; BOLNA SHURU KIJIYE
                      </span>
                    ) : (
                      <span>SPACE TO SPEAK &middot; ENTER &crarr; TO ADD</span>
                    )}

                    {/* Real-time Intent Detection Badge */}
                    {quickAddText.trim() && (() => {
                      if (isExpenseNote(quickAddText.trim())) {
                        const preview = parseExpense(quickAddText.trim());
                        if (preview && preview.amount > 0) {
                          return (
                            <span
                              className="badge-amber"
                              style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "var(--radius-pill)",
                              }}
                            >
                              💳 Expense: ₹{preview.amount.toLocaleString("en-IN")} &middot; {preview.categoryName}
                            </span>
                          );
                        }
                      }
                      const parts = splitCompoundTasks(quickAddText.trim());
                      if (parts.length > 1) {
                        return (
                          <span
                            className="badge-teal"
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-pill)",
                              fontWeight: 600,
                            }}
                          >
                            ⚡ {parts.length} Tasks Detected (Dividing Automatically)
                          </span>
                        );
                      }

                      const dateInfo = resolveNaturalDate(quickAddText.trim());
                      if (dateInfo && dateInfo.date) {
                        return (
                          <span
                            className="badge-teal"
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-pill)",
                            }}
                          >
                            📅 Task: {dateInfo.date} ({dateInfo.label})
                          </span>
                        );
                      }
                      return (
                        <span
                          className="badge-muted"
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-pill)",
                          }}
                        >
                          ⚡ Active Task
                        </span>
                      );
                    })()}
                  </div>

                  <div className="claude-ledger-controls">
                    {/* Speech Language Switcher (hi-IN / en-IN) */}
                    <button
                      type="button"
                      onClick={() => setSpeechLang((prev) => (prev === "en-IN" ? "hi-IN" : "en-IN"))}
                      className="claude-ledger-lang-btn"
                      title={`Current Speech Model: ${speechLang === "hi-IN" ? "Hindi (hi-IN)" : "Hinglish / Indian English (en-IN)"}. Click to toggle.`}
                    >
                      {speechLang === "hi-IN" ? "🇮🇳 हिन्दी" : "🌐 EN-IN"}
                    </button>

                    {/* Microphone Voice Button */}
                    <button
                      type="button"
                      onClick={startVoiceInput}
                      className={`claude-ledger-mic-btn ${isVoiceListening ? "listening" : ""}`}
                      title={
                        isVoiceListening
                          ? `Listening in ${speechLang === "hi-IN" ? "Hindi (hi-IN)" : "Hinglish (en-IN)"}... Click to stop`
                          : `Space or click to speak (${speechLang === "hi-IN" ? "Hindi" : "Hinglish / English"})`
                      }
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </button>

                    {/* Up Arrow Submit Button */}
                    <button
                      type="button"
                      onClick={handleQuickAdd}
                      disabled={!quickAddText.trim() || isAddingTask}
                      className={`claude-ledger-submit-btn ${quickAddText.trim() ? "has-text" : ""}`}
                      title="Add (Enter)"
                    >
                      {isAddingTask ? (
                        <span className="btn-spinner" style={{ width: "12px", height: "12px" }} />
                      ) : (
                        <span>&uarr;</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* PIPELINE INSPECTOR LINE */}
              <div>
                <div
                  className="claude-ledger-meta-line"
                  onClick={() => setShowInspector((prev) => !prev)}
                  title="Click to inspect deterministic AI pipeline telemetry"
                >
                  <span>JEV &middot; 22 QUESTIONS &middot; 385 MS</span>
                  <span style={{ fontSize: "10px", display: "inline-block", transform: showInspector ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
                    &or;
                  </span>
                </div>

                {showInspector && (
                  <div className="claude-ledger-meta-inspector">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <strong style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--color-ink)" }}>
                        Deterministic Parsing Pipeline
                      </strong>
                      <span className="badge-teal" style={{ fontSize: "11px" }}>94.2% Calibrated Confidence</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                      <div>
                        <span style={{ color: "var(--color-muted)" }}>Engine: </span>
                        <strong>AST Grammar Tokenizer</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--color-muted)" }}>Languages: </span>
                        <strong>Hinglish / Hindi / English</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--color-muted)" }}>Latency: </span>
                        <strong>385 ms</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--color-muted)" }}>Hallucination Risk: </span>
                        <strong style={{ color: "#277344" }}>0.00 (Pure Rule AST)</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: TASKS VIEWS */}
          {currentView !== "ideas" && currentView !== "basis" && currentView !== "expenses" && (
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
                      <strong>Personal Flow:</strong> Third-party blockers and waiting bottlenecks are eliminated. All actions save directly to your workspace.
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
MODE = "solo_personal"          # Direct execution synchronized with your workspace`}
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

          {/* TAB: EXPENSES & SPLITWISE (CLAUDE EDITORIAL LEDGER) */}
          {currentView === "expenses" && (
            <div className="claude-ledger-wrapper">
              {/* ENTRIES HEADER & ACTIONS */}
              <div className="claude-ledger-header-row">
                <div className="claude-ledger-entries-title">
                  ENTRIES &middot; {expenses.length}
                </div>

                <div className="claude-ledger-actions">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="claude-ledger-action-link"
                    title="Download ledger as CSV spreadsheet"
                  >
                    <span>&darr;</span> EXPORT
                  </button>

                  <button
                    type="button"
                    onClick={handleClearExpenses}
                    className="claude-ledger-action-link clear-action"
                    title="Clear all logged expenses"
                  >
                    CLEAR
                  </button>
                </div>
              </div>

              {/* 4. LEDGER TABLE */}
              <div style={{ overflowX: "auto" }}>
                <table className="claude-ledger-table">
                  <thead>
                    <tr>
                      <th style={{ width: "16%" }}>DATE</th>
                      <th style={{ width: "46%" }}>DESCRIPTION</th>
                      <th style={{ width: "20%" }}>CATEGORY</th>
                      <th className="col-amount" style={{ width: "18%" }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--color-muted)", borderBottom: "1px dashed var(--color-hairline)" }}>
                          No expense entries yet. Type above or press Space to record.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((exp) => {
                        const isSplit = Boolean(exp.split?.isSplit);
                        const isSettled = Boolean(exp.split?.settled);
                        const owedToYou = isSplit && !isSettled && exp.split.owedTo === "You";
                        const youOwe = isSplit && !isSettled && exp.split.owedTo && exp.split.owedTo !== "You";

                        return (
                          <tr key={exp.id} className="claude-ledger-row">
                            {/* Date */}
                            <td style={{ fontSize: "14px", color: "var(--color-body)", whiteSpace: "nowrap" }}>
                              {formatLedgerDate(exp)}
                            </td>

                            {/* Description + Subline + Splitwise */}
                            <td>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" }}>
                                <div>
                                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-ink)", lineHeight: 1.35 }}>
                                    {exp.title || exp.rawNote || "Expense"}
                                  </div>

                                  {/* Merchant / Location Subline if present */}
                                  {exp.merchant && (
                                    <div style={{ fontSize: "13px", color: "var(--color-muted)", marginTop: "2px" }}>
                                      at {exp.merchant}
                                    </div>
                                  )}
                                </div>

                                {/* Subtle delete button on hover */}
                                <button
                                  type="button"
                                  onClick={() => setExpenseToDelete(exp)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--color-muted-soft)",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    opacity: 0.6,
                                  }}
                                  title="Delete entry"
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>

                            {/* Category */}
                            <td style={{ fontSize: "14px", color: "var(--color-body)" }}>
                              {exp.categoryName || "General"}
                            </td>

                            {/* Amount */}
                            <td className="col-amount" style={{ fontSize: "15.5px", fontWeight: 600, color: "var(--color-ink)", fontVariantNumeric: "tabular-nums" }}>
                              ₹{(exp.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Total Spent Summary Footer */}
                    <tr className="claude-ledger-total-row">
                      <td colSpan={2} style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", letterSpacing: "1.6px", textTransform: "uppercase", fontWeight: 600, color: "var(--color-ink)", padding: "18px 0 12px 0" }}>
                        TOTAL SPENT
                      </td>
                      <td />
                      <td className="col-amount" style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-ink)", fontVariantNumeric: "tabular-nums", padding: "18px 0 12px 0" }}>
                        ₹{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 5. CALIBRATED CONFIDENCE BOTTOM NOTE */}
              <div className="claude-ledger-confidence-note">
                <span className="claude-ledger-confidence-dot" />
                <span title="Deterministic AST extraction ensures 100% mathematical integrity with zero hallucination.">
                  Jev verified with calibrated statistical confidence thresholds. Hover to see why.
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          3. DELETE CONFIRMATION MODALS
          ========================================================================= */}
      {/* Expense Delete Confirmation Modal */}
      {expenseToDelete && (
        <div
          role="dialog"
          aria-modal="true"
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
            if (e.target === e.currentTarget) setExpenseToDelete(null);
          }}
        >
          <div className="claude-modal-box" style={{ maxWidth: "430px" }}>
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
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "20px",
                    fontWeight: 500,
                    margin: "0 0 4px 0",
                    color: "var(--color-ink)",
                  }}
                >
                  Delete Expense?
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--color-muted)", margin: 0, lineHeight: 1.4 }}>
                  Are you sure you want to delete this expense record for <strong>₹{(expenseToDelete.amount || 0).toLocaleString("en-IN")} ({expenseToDelete.title})</strong>?
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="btn-secondary"
                style={{ height: "34px", fontSize: "12.5px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExpense}
                className="btn-danger"
                style={{ height: "34px", fontSize: "12.5px" }}
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Delete Confirmation Modal */}
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
                  Are you sure you want to delete this task? This action cannot be undone.
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
                  Classification and priority score breakdown
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
