import { useEffect, useMemo, useState } from "react";
import "./App.css";

import {
  getTelegramUser,
  getTelegramWebApp,
  type TelegramUser,
} from "./telegram";

type Screen =
  | "home"
  | "battle"
  | "ranking"
  | "profile"
  | "missions"
  | "shop"
  | "result";

type Answer = {
  text: string;
  correct: boolean;
};

type Question = {
  question: string;
  answers: Answer[];
};

type PlayerData = {
  xp: number;
  streak: number;
  battles: number;
  totalCorrect: number;
  bestCombo: number;
  bestBattleXp: number;
};

const ACHIEVEMENTS = [
  {
    id: "first_battle",
    icon: "🎯",
    title: "First Battle",
    text: "Complete your first battle",
    getProgress: (
      player: PlayerData,
      _missions: DailyMissionStats,
      _level: number
    ) => ({
      value: Math.min(player.battles, 1),
      target: 1,
      unlocked: player.battles >= 1,
    }),
  },
  {
    id: "combo_5",
    icon: "🔥",
    title: "On Fire",
    text: "Reach a 5-answer combo",
    getProgress: (
      player: PlayerData,
      _missions: DailyMissionStats,
      _level: number
    ) => ({
      value: Math.min(player.bestCombo, 5),
      target: 5,
      unlocked: player.bestCombo >= 5,
    }),
  },
  {
    id: "level_5",
    icon: "⭐",
    title: "Rising Star",
    text: "Reach Level 5",
    getProgress: (
      _player: PlayerData,
      _missions: DailyMissionStats,
      level: number
    ) => ({
      value: Math.min(level, 5),
      target: 5,
      unlocked: level >= 5,
    }),
  },
  {
    id: "mission_master",
    icon: "🎯",
    title: "Mission Master",
    text: "Claim all daily missions",
    getProgress: (
      _player: PlayerData,
      missions: DailyMissionStats,
      _level: number
    ) => ({
      value: Math.min(
        missions.claimed.length,
        DAILY_MISSIONS.length
      ),
      target: DAILY_MISSIONS.length,
      unlocked:
        missions.claimed.length >=
        DAILY_MISSIONS.length,
    }),
  },
  {
    id: "speed_demon",
    icon: "⚡",
    title: "Speed Demon",
    text: "Earn 300 XP in a single battle",
    getProgress: (
      player: PlayerData,
      _missions: DailyMissionStats,
      _level: number
    ) => ({
      value: Math.min(
        player.bestBattleXp,
        300
      ),
      target: 300,
      unlocked:
        player.bestBattleXp >= 300,
    }),
  },
  {
    id: "iq_legend",
    icon: "👑",
    title: "IQ Legend",
    text: "Earn 5,000 total XP",
    getProgress: (
      player: PlayerData,
      _missions: DailyMissionStats,
      _level: number
    ) => ({
      value: Math.min(player.xp, 5000),
      target: 5000,
      unlocked: player.xp >= 5000,
    }),
  },
];

const API_BASE = "https://battle-iq-api.gonta1906.workers.dev";

type ApiAnswer =
  | string
  | {
      text: string;
      correct: boolean;
    };

type ApiQuestion = {
  id: number;
  question: string;
  answers: ApiAnswer[];
  correctIndex?: number;
  category?: string;
  difficulty?: string;
};

function normalizeApiQuestions(items: ApiQuestion[]): Question[] {
  return items
    .filter(
      (item) =>
        typeof item.question === "string" &&
        Array.isArray(item.answers) &&
        item.answers.length === 4
    )
    .map((item) => {
      const objectAnswers = item.answers.every(
        (answer) =>
          typeof answer === "object" &&
          answer !== null &&
          typeof answer.text === "string" &&
          typeof answer.correct === "boolean"
      );

      if (objectAnswers) {
        return {
          question: item.question,
          answers: (item.answers as {
            text: string;
            correct: boolean;
          }[]).map((answer) => ({
            text: answer.text,
            correct: answer.correct,
          })),
        };
      }

      const stringAnswers = item.answers.every(
        (answer) => typeof answer === "string"
      );

      if (
        stringAnswers &&
        Number.isInteger(item.correctIndex) &&
        item.correctIndex! >= 0 &&
        item.correctIndex! < item.answers.length
      ) {
        return {
          question: item.question,
          answers: (item.answers as string[]).map(
            (text, index) => ({
              text,
              correct: index === item.correctIndex,
            })
          ),
        };
      }

      return null;
    })
    .filter((item): item is Question => item !== null);
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

function getLevelInfo(totalXp: number) {
  let level = 1;
  let xp = totalXp;
  let requiredXp = 500;

  while (xp >= requiredXp) {
    xp -= requiredXp;
    level++;
    requiredXp = Math.floor(
      requiredXp * 1.25
    );
  }

  return {
    level,
    currentXp: xp,
    requiredXp,
  };
}

type DailyMissionStats = {
  date: string;
  battles: number;
  correct: number;
  bestCombo: number;
  xpEarned: number;
  claimed: string[];
};

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadDailyMissionStats(): DailyMissionStats {
  const today = getTodayKey();

  try {
    const saved = localStorage.getItem(
      "battle_iq_daily_missions"
    );

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch {}

  return {
    date: today,
    battles: 0,
    correct: 0,
    bestCombo: 0,
    xpEarned: 0,
    claimed: [],
  };
}

const DAILY_MISSIONS = [
  {
    id: "battle_3",
    icon: "⚔️",
    title: "Warm Up",
    description: "Complete 3 battles today",
    target: 3,
    reward: 150,
    getProgress: (
      stats: DailyMissionStats
    ) => stats.battles,
  },
  {
    id: "correct_20",
    icon: "🧠",
    title: "Sharp Mind",
    description: "Answer 20 questions correctly",
    target: 20,
    reward: 200,
    getProgress: (
      stats: DailyMissionStats
    ) => stats.correct,
  },
  {
    id: "combo_5",
    icon: "🔥",
    title: "On Fire",
    description: "Reach a 5-answer combo",
    target: 5,
    reward: 250,
    getProgress: (
      stats: DailyMissionStats
    ) => stats.bestCombo,
  },
  {
    id: "xp_500",
    icon: "⚡",
    title: "XP Hunter",
    description: "Earn 500 XP from battles",
    target: 500,
    reward: 300,
    getProgress: (
      stats: DailyMissionStats
    ) => stats.xpEarned,
  },
];

function App() {
  // ==========================================
  // TELEGRAM
  // ==========================================

  const [telegramUser, setTelegramUser] =
    useState<TelegramUser | null>(null);

  useEffect(() => {
    const webApp = getTelegramWebApp();

    if (!webApp) {
      console.log(
        "BATTLE IQ: running outside Telegram"
      );

      return;
    }

    webApp.ready();
    webApp.expand();

    webApp.setBackgroundColor("#080711");
    webApp.setHeaderColor("#080711");

    const user = getTelegramUser();

    if (user) {
      console.log(
        "Telegram user:",
        user
      );

      setTelegramUser(user);
    }
  }, []);

  // ==========================================
  // LOAD QUESTIONS FROM D1
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setQuestionsLoading(true);
      setQuestionsError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/questions?limit=2000`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error || "Не вдалося завантажити питання"
          );
        }

        const normalized = normalizeApiQuestions(
          Array.isArray(data.questions)
            ? data.questions
            : []
        );

        if (!normalized.length) {
          throw new Error("База питань порожня");
        }

        if (!cancelled) {
          setQuestionBank(normalized);
        }
      } catch (error) {
        console.error(
          "BATTLE IQ: questions loading failed",
          error
        );

        if (!cancelled) {
          setQuestionsError(
            "Не вдалося завантажити питання. Спробуй ще раз."
          );
        }
      } finally {
        if (!cancelled) {
          setQuestionsLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // GAME STATE
  // ==========================================

  const [screen, setScreen] =
    useState<Screen>("home");

  const [rankingTab, setRankingTab] =
    useState<"world" | "friends">("world");

  const [rankingSearch, setRankingSearch] =
    useState("");

  const [challengeNotice, setChallengeNotice] =
    useState("");

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [dailyMissions, setDailyMissions] =
    useState<DailyMissionStats>(() =>
      loadDailyMissionStats()
    );

  const [achievementToast, setAchievementToast] =
    useState<{
      icon: string;
      title: string;
    } | null>(null);

  const [battleCombo, setBattleCombo] =
    useState(0);

  // D1 is the source of truth for player progression.
  // localStorage is intentionally not used for XP/level/battles.
  const [player, setPlayer] =
    useState<PlayerData>({
      xp: 0,
      streak: 0,
      battles: 0,
      totalCorrect: 0,
      bestCombo: 0,
      bestBattleXp: 0,
    });

  const [gameQuestions, setGameQuestions] =
    useState<Question[]>([]);

  const [questionBank, setQuestionBank] =
    useState<Question[]>([]);

  const [questionsLoading, setQuestionsLoading] =
    useState(true);

  const [questionsError, setQuestionsError] =
    useState("");

  const [questionIndex, setQuestionIndex] =
    useState(0);

  const [score, setScore] =
    useState(0);

  const [battleXp, setBattleXp] =
    useState(0);

  const [selectedAnswer, setSelectedAnswer] =
    useState<number | null>(null);

  const [timeLeft, setTimeLeft] =
    useState(60);

  const [battleFinished, setBattleFinished] =
    useState(false);

  const [previousXp, setPreviousXp] =
    useState(player.xp);

  const [globalRank, setGlobalRank] =
    useState<number | null>(null);

  const currentQuestion =
    gameQuestions[questionIndex];

  const levelInfo = useMemo(
    () => getLevelInfo(player.xp),
    [player.xp]
  );

  const previousLevelInfo = useMemo(
    () => getLevelInfo(previousXp),
    [previousXp]
  );

  const levelProgress =
    (levelInfo.currentXp /
      levelInfo.requiredXp) *
    100;

  // ==========================================
  // SYNC PLAYER PROFILE WITH D1
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async () => {
      const webApp = getTelegramWebApp();
      if (!webApp?.initData) return;

      try {
        const response = await fetch(`${API_BASE}/api/me`, {
          method: "GET",
          headers: {
            Authorization: `tma ${webApp.initData}`,
            Accept: "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok || !data?.ok || !data?.user || cancelled) return;

        const remote = data.user;

        setPlayer((current) => ({
          ...current,
          xp: Number(remote.xp ?? current.xp),
          streak: Number(remote.streak ?? current.streak),
          battles: Number(remote.battles ?? current.battles),
          totalCorrect: Number(remote.totalCorrect ?? current.totalCorrect),
          bestCombo: Number(remote.bestCombo ?? current.bestCombo),
          bestBattleXp: Number(remote.bestBattleXp ?? current.bestBattleXp),
        }));

        if (remote.globalRank != null) {
          setGlobalRank(Number(remote.globalRank));
        }
      } catch (error) {
        console.warn("BATTLE IQ: profile sync failed", error);
      }
    };

    syncProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // LOAD REAL GLOBAL RANKING
  // ==========================================

  const [leaderboard, setLeaderboard] =
    useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      try {
        const tg = getTelegramWebApp();
        const initData = tg?.initData || "";

        if (!initData) {
          return;
        }

        const response = await fetch(`${API_BASE}/api/ranking`, {
          headers: {
            Accept: "application/json",
            Authorization: `tma ${initData}`,
          },
        });

        const data = await response.json();
        if (!response.ok || !data?.ok || cancelled) return;

        setLeaderboard(Array.isArray(data.users) ? data.users : []);

        if (data.me?.globalRank != null) {
          setGlobalRank(Number(data.me.globalRank));
        }
      } catch (error) {
        console.warn("BATTLE IQ: leaderboard sync failed", error);
      }
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [player.xp, player.battles]);

  useEffect(() => {
    localStorage.setItem(
      "battle_iq_daily_missions",
      JSON.stringify(dailyMissions)
    );
  }, [dailyMissions]);

  useEffect(() => {
    const unlocked = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.getProgress(
          player,
          dailyMissions,
          levelInfo.level
        ).unlocked
    );

    let seen: string[] = [];

    try {
      const saved = localStorage.getItem(
        "battle_iq_seen_achievements"
      );

      if (saved) {
        seen = JSON.parse(saved);
      }
    } catch {}

    const newlyUnlocked =
      unlocked.find(
        (achievement) =>
          !seen.includes(achievement.id)
      );

    if (newlyUnlocked) {
      const updatedSeen = [
        ...seen,
        newlyUnlocked.id,
      ];

      localStorage.setItem(
        "battle_iq_seen_achievements",
        JSON.stringify(updatedSeen)
      );

      setAchievementToast({
        icon: newlyUnlocked.icon,
        title: newlyUnlocked.title,
      });

      getTelegramWebApp()
        ?.HapticFeedback?.notificationOccurred(
          "success"
        );

      window.setTimeout(() => {
        setAchievementToast(null);
      }, 3500);
    }
  }, [
    player,
    dailyMissions,
    levelInfo.level,
  ]);

  // ==========================================
  // TIMER
  // ==========================================

  useEffect(() => {
    if (screen !== "battle") return;

    if (battleFinished) return;

    if (timeLeft <= 0) {
      finishBattle();
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft(
        (value) => value - 1
      );
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    screen,
    timeLeft,
    battleFinished,
  ]);

  // ==========================================
  // START BATTLE
  // ==========================================

  const startBattle = () => {
    const webApp =
      getTelegramWebApp();

    webApp?.HapticFeedback?.impactOccurred(
      "medium"
    );

    if (questionsLoading) {
      setChallengeNotice(
        "⏳ Завантажуємо питання..."
      );

      window.setTimeout(() => {
        setChallengeNotice("");
      }, 1800);

      return;
    }

    if (questionsError || questionBank.length < 10) {
      setChallengeNotice(
        "⚠️ Не вдалося завантажити банк питань."
      );

      window.setTimeout(() => {
        setChallengeNotice("");
      }, 2500);

      return;
    }

    const selectedQuestions =
      shuffle(questionBank).slice(0, 10);

    const preparedQuestions =
      selectedQuestions.map(
        (question) => ({
          ...question,
          answers: shuffle(
            question.answers
          ),
        })
      );

    setGameQuestions(
      preparedQuestions
    );

    setQuestionIndex(0);
    setScore(0);
    setBattleXp(0);
    setBattleCombo(0);
    setSelectedAnswer(null);
    setTimeLeft(60);
    setBattleFinished(false);

    setScreen("battle");
  };

  // ==========================================
  // FINISH BATTLE
  // ==========================================

  const finishBattle = () => {
    if (battleFinished) return;

    setBattleFinished(true);
    setPreviousXp(player.xp);

    const webApp =
      getTelegramWebApp();

    webApp?.HapticFeedback?.notificationOccurred(
      "success"
    );

    // Persist the completed battle to D1 so ADMIN sees the same data.
    if (webApp?.initData) {
      void (async () => {
        try {
          const response = await fetch(`${API_BASE}/api/battles`, {
            method: "POST",
            headers: {
              Authorization: `tma ${webApp.initData}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              score: score * 10,
              correctAnswers: score,
              xp: battleXp,
              durationSeconds: Math.max(0, 60 - timeLeft),
              bestCombo: battleCombo,
            }),
          });

          const data = await response.json().catch(() => null);
          if (!response.ok || !data?.ok) {
            throw new Error(data?.error || `Battle sync failed (${response.status})`);
          }

          if (data.profile) {
            setPlayer((current) => ({
              ...current,
              xp: Number(data.profile.xp ?? current.xp),
              streak: Number(data.profile.streak ?? current.streak),
              battles: Number(data.profile.battles ?? current.battles),
              totalCorrect: Number(data.profile.totalCorrect ?? current.totalCorrect),
              bestCombo: Number(data.profile.bestCombo ?? current.bestCombo),
              bestBattleXp: Number(
                data.profile.bestBattleXp ?? current.bestBattleXp
              ),
            }));
          }
        } catch (error) {
          console.warn("BATTLE IQ: battle sync failed", error);
        }
      })();
    }

    setDailyMissions((current) => ({
      ...current,
      battles: current.battles + 1,
      correct: current.correct + score,
      bestCombo: Math.max(
        current.bestCombo,
        battleCombo
      ),
      xpEarned:
        current.xpEarned + battleXp,
    }));

    setScreen("result");
  };

  // ==========================================
  // NEXT QUESTION
  // ==========================================

  const nextQuestion = () => {
    if (
      questionIndex + 1 >=
      gameQuestions.length
    ) {
      finishBattle();
      return;
    }

    setQuestionIndex(
      (value) => value + 1
    );

    setSelectedAnswer(null);
  };

  // ==========================================
  // ANSWER
  // ==========================================

  const answerQuestion = (
    answerIndex: number
  ) => {
    if (!currentQuestion) return;

    if (selectedAnswer !== null)
      return;

    setSelectedAnswer(
      answerIndex
    );

    const answer =
      currentQuestion.answers[
        answerIndex
      ];

    const webApp =
      getTelegramWebApp();

    if (answer.correct) {
      webApp?.HapticFeedback?.notificationOccurred(
        "success"
      );

      setScore(
        (value) => value + 1
      );

      setBattleCombo(
        (value) => value + 1
      );

      const speedBonus =
        Math.floor(timeLeft / 3);

      const nextCombo =
        battleCombo + 1;

      const comboMultiplier =
        Math.min(
          3,
          1 +
            Math.floor(
              nextCombo / 3
            )
        );

      const earnedXp =
        (50 + speedBonus) *
        comboMultiplier;

      setBattleXp(
        (value) =>
          value + earnedXp
      );
    } else {
      webApp?.HapticFeedback?.notificationOccurred(
        "error"
      );

      setBattleCombo(0);
    }

    window.setTimeout(() => {
      nextQuestion();
    }, 700);
  };

  // ==========================================
  // HEADER
  // ==========================================

  const Header = () => (
    <>
      {achievementToast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "18px",
            transform: "translateX(-50%)",
            zIndex: 2000,
            width: "min(330px, calc(100vw - 32px))",
            padding: "13px 15px",
            borderRadius: "15px",
            background:
              "rgba(31, 20, 63, 0.98)",
            border:
              "1px solid rgba(168,85,247,0.55)",
            boxShadow:
              "0 16px 45px rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            gap: "11px",
            animation:
              "battleIqAchievementPop 0.28s ease-out",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "11px",
              display: "grid",
              placeItems: "center",
              background:
                "rgba(124,77,255,0.22)",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            {achievementToast.icon}
          </div>

          <div>
            <strong
              style={{
                display: "block",
                fontSize: "12px",
                letterSpacing: "0.04em",
              }}
            >
              🏅 ACHIEVEMENT UNLOCKED
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "2px",
                fontSize: "14px",
                fontWeight: 800,
              }}
            >
              {achievementToast.title}
            </span>
          </div>
        </div>
      )}

      <style>
        {`@keyframes battleIqAchievementPop {
          from {
            opacity: 0;
            transform: translate(-50%, -14px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }`}
      </style>

      <header className="topbar">
        <div className="logo">
          <span className="logo-icon">
            ⚡
          </span>

          <span>
            BATTLE <b>IQ</b>
          </span>
        </div>

        <div className="top-actions">
          <button
            className="icon-btn"
            onClick={() => {
              setNotificationsOpen(
                (value) => !value
              );
              setSettingsOpen(false);

              getTelegramWebApp()
                ?.HapticFeedback?.selectionChanged();
            }}
            aria-label="Notifications"
          >
            🔔
          </button>

          <button
            className="icon-btn"
            onClick={() => {
              setSettingsOpen(
                (value) => !value
              );
              setNotificationsOpen(false);

              getTelegramWebApp()
                ?.HapticFeedback?.selectionChanged();
            }}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {notificationsOpen && (
        <div
          style={{
            position: "fixed",
            top: "68px",
            right: "14px",
            width: "min(310px, calc(100vw - 28px))",
            zIndex: 1000,
            padding: "16px",
            borderRadius: "16px",
            background:
              "rgba(18, 15, 35, 0.98)",
            border:
              "1px solid rgba(255,255,255,0.10)",
            boxShadow:
              "0 18px 50px rgba(0,0,0,0.45)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <strong>
              🔔 Notifications
            </strong>

            <button
              onClick={() =>
                setNotificationsOpen(false)
              }
              style={{
                border: 0,
                background: "transparent",
                color: "inherit",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "rgba(124, 77, 255, 0.12)",
              fontSize: "13px",
              lineHeight: 1.45,
            }}
          >
            🎮 Your next BATTLE IQ challenge
            is waiting.
            <br />
            <span style={{ opacity: 0.65 }}>
              Complete a battle to earn XP.
            </span>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          style={{
            position: "fixed",
            top: "68px",
            right: "14px",
            width: "min(310px, calc(100vw - 28px))",
            zIndex: 1000,
            padding: "16px",
            borderRadius: "16px",
            background:
              "rgba(18, 15, 35, 0.98)",
            border:
              "1px solid rgba(255,255,255,0.10)",
            boxShadow:
              "0 18px 50px rgba(0,0,0,0.45)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <strong>
              ⚙️ Settings
            </strong>

            <button
              onClick={() =>
                setSettingsOpen(false)
              }
              style={{
                border: 0,
                background: "transparent",
                color: "inherit",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "rgba(255,255,255,0.05)",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "9px",
              }}
            >
              <span>Telegram Mini App</span>
              <strong>ON</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "9px",
              }}
            >
              <span>Haptic feedback</span>
              <strong>ON</strong>
            </div>

            <div
              style={{
                opacity: 0.55,
                fontSize: "11px",
              }}
            >
              More settings will be added
              soon.
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ==========================================
  // BOTTOM NAV
  // ==========================================

  const BottomNav = () => (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${
          screen === "home"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setScreen("home")
        }
      >
        <span>⌂</span>
        <small>Home</small>
      </button>

      <button
        className={`nav-item ${
          screen === "battle"
            ? "active"
            : ""
        }`}
        onClick={startBattle}
      >
        <span>⚔</span>
        <small>Battle</small>
      </button>

      <button
        className={`nav-item ${
          screen === "shop"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setScreen("shop")
        }
      >
        <span>⭐</span>
        <small>Shop</small>
      </button>

      <button
        className={`nav-item ${
          screen === "ranking"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setScreen("ranking")
        }
      >
        <span>🏆</span>
        <small>Ranking</small>
      </button>

      <button
        className={`nav-item ${
          screen === "profile"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setScreen("profile")
        }
      >
        <span>👤</span>
        <small>Profile</small>
      </button>
    </nav>
  );

  // ==========================================
  // HOME
  // ==========================================

  const handleChallenge = async (name: string) => {
    const webApp = getTelegramWebApp();

    webApp?.HapticFeedback?.impactOccurred(
      "medium"
    );

    const inviteText =
      name === "friend"
        ? "⚔️ Приєднуйся до BATTLE IQ! Перевіримо, у кого IQ вищий 😎"
        : `⚔️ ${name}, викликаю тебе на BATTLE IQ!`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "BATTLE IQ",
          text: inviteText,
        });
        setChallengeNotice("✅ Invite shared!");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteText);
        setChallengeNotice("✅ Invite text copied!");
      } else {
        setChallengeNotice(inviteText);
      }
    } catch {
      setChallengeNotice("⚔️ Invite cancelled.");
    }

    window.setTimeout(() => {
      setChallengeNotice("");
    }, 3000);
  };


  if (screen === "home") {
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <Header />

        <main className="content">
          <section className="profile-card">
            <div className="avatar">
              😎
            </div>

            <div className="profile-info">
              <div className="username">
                {telegramUser?.first_name ||
                  "SERGIO"}
              </div>

              <div className="level">
                LEVEL {levelInfo.level}
              </div>

              <div className="xp-row">
                <span>
                  {levelInfo.currentXp.toLocaleString()}{" "}
                  XP
                </span>

                <span>
                  {levelInfo.requiredXp.toLocaleString()}{" "}
                  XP
                </span>
              </div>

              <div className="xp-bar">
                <div
                  className="xp-progress"
                  style={{
                    width: `${levelProgress}%`,
                  }}
                />
              </div>
            </div>

            <div className="rank">
              <span>🏆</span>
              <strong>
                #{globalRank?.toLocaleString() ?? "—"}
              </strong>
            </div>
          </section>

          <section className="hero-card">
            {questionsLoading && (
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "12px",
                  opacity: 0.8,
                }}
              >
                ⏳ Завантажуємо {questionBank.length || "банк"} питань...
              </div>
            )}

            {questionsError && (
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "12px",
                  color: "#ff9b9b",
                }}
              >
                ⚠️ {questionsError}
              </div>
            )}

            <div className="hero-badge">
              🔥 DAILY CHALLENGE
            </div>

            <h1>
              Ready to
              <br />
              prove yourself?
            </h1>

            <p>
              10 questions. 60
              seconds.
              <br />
              Beat the world.
            </p>

            <button
              className="play-button"
              onClick={startBattle}
            >
              <span>⚔️</span>

              PLAY NOW

              <span className="arrow">
                →
              </span>
            </button>

            <div className="hero-stats">
              <div>
                <strong>
                  {questionBank.length}
                </strong>

                <span>
                  Questions in bank
                </span>
              </div>

              <div>
                <strong>
                  60s
                </strong>

                <span>
                  Time
                </span>
              </div>

              <div>
                <strong>
                  🔥{" "}
                  {player.streak}
                </strong>

                <span>
                  Day streak
                </span>
              </div>
            </div>
          </section>

          <div className="section-title">
            <h2>
              Your progress
            </h2>

            <span>
              {player.battles} battles
            </span>
          </div>

          <section className="quick-grid">
            <button
              className="quick-card"
              onClick={() =>
                setScreen("shop")
              }
            >
              <div className="quick-icon" style={{ background: "linear-gradient(135deg, rgba(255,199,92,0.2), rgba(255,120,70,0.16))" }}>
                ⭐
              </div>

              <div>
                <strong>SHOP</strong>
                <span>Avatars, frames & passes</span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-card"
              onClick={() =>
                setScreen("missions")
              }
            >
              <div className="quick-icon purple">
                🎯
              </div>

              <div>
                <strong>
                  MISSIONS
                </strong>

                <span>
                  {DAILY_MISSIONS.filter(
                    (mission) =>
                      mission.getProgress(
                        dailyMissions
                      ) >= mission.target
                  ).length}
                  /{DAILY_MISSIONS.length} complete
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-card"
              onClick={() =>
                setScreen(
                  "ranking"
                )
              }
            >
              <div className="quick-icon gold">
                🏆
              </div>

              <div>
                <strong>
                  RANKING
                </strong>

                <span>
                  You're #{globalRank?.toLocaleString() ?? "—"}
                </span>
              </div>

              <b>→</b>
            </button>
          </section>

          <section className="challenge-card">
            <div className="challenge-left">
              <div className="mini-icon">
                ⚔️
              </div>

              <div>
                <strong>
                  CHALLENGE A FRIEND
                </strong>

                <span>
                  Invite a friend
                </span>
              </div>
            </div>

            <button
              className="challenge-button"
              onClick={() => handleChallenge("friend")}
              type="button"
            >
              INVITE
            </button>
          </section>
        </main>

        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // SHOP
  // ==========================================

  if (screen === "shop") {
    const shopProducts = [
      { id: "custom_avatar", icon: "🖼️", title: "Custom Avatar", text: "Use your own profile picture", price: 50, category: "PROFILE", featured: true },
      { id: "neon_frame", icon: "🟣", title: "Neon Frame", text: "Stand out in the ranking", price: 25, category: "PROFILE" },
      { id: "fire_frame", icon: "🔥", title: "Fire Frame", text: "Bring the heat to your profile", price: 50, category: "PROFILE" },
      { id: "legendary_frame", icon: "👑", title: "Legendary Frame", text: "Premium profile frame", price: 100, category: "PROFILE" },
      { id: "second_chance", icon: "❤️", title: "Second Chance", text: "One extra life in a battle", price: 15, category: "BATTLE" },
      { id: "combo_shield", icon: "🛡️", title: "Combo Shield", text: "Protect your combo from one mistake", price: 30, category: "BATTLE" },
      { id: "xp_boost", icon: "⚡", title: "XP Boost", text: "Boost your battle progression", price: 25, category: "BATTLE" },
      { id: "battle_pass", icon: "🎟️", title: "Battle Pass", text: "Unlock exclusive season rewards", price: 299, category: "PASS", featured: true },
    ];

    const buyProduct = (product: typeof shopProducts[number]) => {
      getTelegramWebApp()?.HapticFeedback?.impactOccurred("medium");
      setChallengeNotice(`⭐ ${product.title} — Telegram Stars payment will be connected next.`);
      window.setTimeout(() => setChallengeNotice(""), 3200);
    };

    const categories = ["PROFILE", "BATTLE", "PASS"];

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />

        <main className="content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.8, fontWeight: 900, opacity: 0.5 }}>BATTLE IQ STORE</div>
              <h1 style={{ margin: "4px 0 0", fontSize: 30, lineHeight: 1.05 }}>Shop</h1>
            </div>
            <div style={{ padding: "9px 13px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 900, fontSize: 13 }}>⭐ Stars</div>
          </div>

          <section style={{ position: "relative", overflow: "hidden", padding: 20, borderRadius: 24, background: "linear-gradient(135deg, rgba(124,77,255,0.22), rgba(255,94,168,0.10))", border: "1px solid rgba(157,122,255,0.22)", marginBottom: 24 }}>
            <div style={{ position: "absolute", width: 150, height: 150, right: -55, top: -65, borderRadius: "50%", background: "rgba(124,77,255,0.18)", filter: "blur(8px)" }} />
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, opacity: 0.65 }}>PREMIUM ITEMS</div>
            <div style={{ fontSize: 22, fontWeight: 950, marginTop: 7 }}>Make your profile yours.</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.62, maxWidth: 290, marginTop: 6 }}>Avatars, frames, battle boosts and the season pass. Buy exactly what you want with Telegram Stars.</div>
          </section>

          {categories.map((category) => (
            <section key={category} style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ marginBottom: 11 }}>
                <h2>{category === "PROFILE" ? "👤 Profile" : category === "BATTLE" ? "⚔️ Battle" : "🎟️ Season"}</h2>
                <span>⭐ Stars</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {shopProducts.filter((p) => p.category === category).map((product) => (
                  <div key={product.id} style={{ position: "relative", padding: 14, minHeight: 170, borderRadius: 20, background: product.featured ? "linear-gradient(145deg, rgba(124,77,255,0.18), rgba(255,255,255,0.045))" : "rgba(255,255,255,0.045)", border: product.featured ? "1px solid rgba(145,110,255,0.28)" : "1px solid rgba(255,255,255,0.07)", boxSizing: "border-box" }}>
                    {product.featured && <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 7px", borderRadius: 8, fontSize: 8, fontWeight: 950, background: "rgba(124,77,255,0.28)", color: "#cfc1ff" }}>FEATURED</div>}
                    <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 15, background: "rgba(255,255,255,0.07)", fontSize: 25, marginBottom: 12 }}>{product.icon}</div>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>{product.title}</div>
                    <div style={{ fontSize: 10.5, lineHeight: 1.35, opacity: 0.55, marginTop: 4, minHeight: 29 }}>{product.text}</div>
                    <button type="button" onClick={() => buyProduct(product)} style={{ width: "100%", marginTop: 11, border: "none", borderRadius: 11, padding: "9px 8px", background: "rgba(255,255,255,0.09)", color: "inherit", fontWeight: 900, fontSize: 11, cursor: "pointer" }}>BUY · {product.price} ⭐</button>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div style={{ padding: "13px 14px", borderRadius: 15, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 10.5, lineHeight: 1.5, opacity: 0.52, textAlign: "center", marginBottom: 12 }}>
            Purchases will use official Telegram Stars. No random boxes — you buy the exact item shown.
          </div>
        </main>

        {challengeNotice && (
          <div style={{ position: "fixed", left: 16, right: 16, bottom: 78, zIndex: 30, padding: "13px 15px", borderRadius: 15, background: "rgba(22,19,32,0.96)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 14px 40px rgba(0,0,0,0.35)", fontSize: 12, fontWeight: 800, textAlign: "center" }}>
            {challengeNotice}
          </div>
        )}

        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // MISSIONS
  // ==========================================

  if (screen === "missions") {
    const claimMission = (
      missionId: string,
      reward: number
    ) => {
      void reward;

      const mission =
        DAILY_MISSIONS.find(
          (item) => item.id === missionId
        );

      if (!mission) return;

      const progress =
        mission.getProgress(
          dailyMissions
        );

      const alreadyClaimed =
        dailyMissions.claimed.includes(
          missionId
        );

      if (
        progress < mission.target ||
        alreadyClaimed
      ) {
        return;
      }

      getTelegramWebApp()
        ?.HapticFeedback?.notificationOccurred(
          "success"
        );

      // Progression XP is authoritative in D1. Mission rewards stay out of
      // local player state until a server-side claim endpoint is connected.
      setDailyMissions((current) => ({
        ...current,
        claimed: [
          ...current.claimed,
          missionId,
        ],
      }));
    };

    const completedCount =
      DAILY_MISSIONS.filter(
        (mission) =>
          mission.getProgress(
            dailyMissions
          ) >= mission.target
      ).length;

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <Header />

        <main className="profile-page">
          <section className="profile-hero">
            <div
              className="profile-big-avatar"
            >
              🎯
            </div>

            <h1>
              DAILY MISSIONS
            </h1>

            <div className="profile-level">
              {completedCount}/
              {DAILY_MISSIONS.length} COMPLETE
            </div>

            <p
              style={{
                marginTop: "8px",
                opacity: 0.65,
                fontSize: "13px",
              }}
            >
              Complete missions every day
              and earn bonus XP.
            </p>
          </section>

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {DAILY_MISSIONS.map(
              (mission) => {
                const progress = Math.min(
                  mission.getProgress(
                    dailyMissions
                  ),
                  mission.target
                );

                const completed =
                  progress >= mission.target;

                const claimed =
                  dailyMissions.claimed.includes(
                    mission.id
                  );

                const percent =
                  (progress /
                    mission.target) *
                  100;

                return (
                  <div
                    key={mission.id}
                    style={{
                      padding: "16px",
                      borderRadius: "16px",
                      background:
                        completed
                          ? "rgba(124,77,255,0.16)"
                          : "rgba(255,255,255,0.05)",
                      border:
                        completed
                          ? "1px solid rgba(124,77,255,0.35)"
                          : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          display: "grid",
                          placeItems: "center",
                          background:
                            "rgba(124,77,255,0.14)",
                          fontSize: "22px",
                          flexShrink: 0,
                        }}
                      >
                        {mission.icon}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: "14px",
                          }}
                        >
                          {mission.title}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "3px",
                            fontSize: "12px",
                            opacity: 0.65,
                          }}
                        >
                          {mission.description}
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: "13px",
                          }}
                        >
                          +{mission.reward}
                        </strong>

                        <small
                          style={{
                            opacity: 0.55,
                          }}
                        >
                          XP
                        </small>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "14px",
                        height: "7px",
                        borderRadius: "999px",
                        overflow: "hidden",
                        background:
                          "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,
                          height: "100%",
                          borderRadius: "999px",
                          background:
                            "linear-gradient(90deg, #7c4dff, #a855f7)",
                          transition:
                            "width 0.25s ease",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginTop: "9px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          opacity: 0.6,
                        }}
                      >
                        {progress}/
                        {mission.target}
                      </span>

                      <button
                        disabled={
                          !completed ||
                          claimed
                        }
                        onClick={() =>
                          claimMission(
                            mission.id,
                            mission.reward
                          )
                        }
                        style={{
                          border: 0,
                          borderRadius: "10px",
                          padding:
                            "8px 12px",
                          background:
                            claimed
                              ? "rgba(255,255,255,0.08)"
                              : completed
                              ? "#7c4dff"
                              : "rgba(255,255,255,0.06)",
                          color: "inherit",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor:
                            completed &&
                            !claimed
                              ? "pointer"
                              : "default",
                          opacity:
                            !completed ||
                            claimed
                              ? 0.55
                              : 1,
                        }}
                      >
                        {claimed
                          ? "✓ CLAIMED"
                          : completed
                          ? "CLAIM XP"
                          : "LOCKED"}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </section>
        </main>

        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // PROFILE
  // ==========================================

  if (screen === "profile") {
    const achievements = ACHIEVEMENTS.map(
      (achievement) => {
        const progress =
          achievement.getProgress(
            player,
            dailyMissions,
            levelInfo.level
          );

        return {
          ...achievement,
          ...progress,
        };
      }
    );

    const unlockedAchievements =
      achievements.filter(
        (item) => item.unlocked
      ).length;

    const displayName =
      telegramUser?.first_name ||
      "Sergio";

    const displayUsername =
      telegramUser?.username
        ? `@${telegramUser.username}`
        : "BATTLE IQ PLAYER";

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <Header />

        <main
          className="profile-page"
          style={{
            paddingBottom: "100px",
            overflowX: "hidden",
          }}
        >
          {/* PROFILE HERO */}
          <section
            className="profile-hero"
            style={{
              padding: "24px 16px 20px",
              textAlign: "center",
              borderRadius: "20px",
              background:
                "linear-gradient(145deg, rgba(124,77,255,0.18), rgba(255,255,255,0.035))",
              border:
                "1px solid rgba(255,255,255,0.08)",
              boxSizing: "border-box",
            }}
          >
            <div
              className="profile-big-avatar"
              style={{
                width: "76px",
                height: "76px",
                margin: "0 auto 12px",
                borderRadius: "22px",
                display: "grid",
                placeItems: "center",
                fontSize: "36px",
                background:
                  "linear-gradient(145deg, rgba(124,77,255,0.35), rgba(168,85,247,0.18))",
                border:
                  "1px solid rgba(168,85,247,0.30)",
                boxShadow:
                  "0 12px 35px rgba(124,77,255,0.18)",
              }}
            >
              😎
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "27px",
                lineHeight: 1.15,
                fontWeight: 900,
                wordBreak: "break-word",
              }}
            >
              {displayName}
            </h1>

            <div
              style={{
                marginTop: "5px",
                fontSize: "12px",
                opacity: 0.55,
                wordBreak: "break-word",
              }}
            >
              {displayUsername}
            </div>

            <div
              className="profile-level"
              style={{
                display: "inline-flex",
                marginTop: "13px",
                padding: "7px 12px",
                borderRadius: "999px",
                background:
                  "rgba(124,77,255,0.18)",
                border:
                  "1px solid rgba(124,77,255,0.28)",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.06em",
              }}
            >
              LEVEL {levelInfo.level}
            </div>

            <div
              className="profile-xp"
              style={{
                marginTop: "18px",
                textAlign: "left",
              }}
            >
              <div
                className="profile-xp-top"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginBottom: "7px",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    opacity: 0.6,
                  }}
                >
                  XP PROGRESS
                </span>

                <span
                  style={{
                    whiteSpace: "nowrap",
                  }}
                >
                  {levelInfo.currentXp.toLocaleString()}
                  {" / "}
                  {levelInfo.requiredXp.toLocaleString()}
                </span>
              </div>

              <div
                className="xp-bar"
                style={{
                  height: "8px",
                  borderRadius: "999px",
                  overflow: "hidden",
                  background:
                    "rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="xp-progress"
                  style={{
                    width: `${levelProgress}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background:
                      "linear-gradient(90deg, #7c4dff, #a855f7)",
                    transition:
                      "width 0.3s ease",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: "7px",
                  textAlign: "right",
                  fontSize: "10px",
                  opacity: 0.45,
                }}
              >
                {Math.round(levelProgress)}% to next level
              </div>
            </div>
          </section>

          {/* STATS */}
          <section
            className="stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "14px",
            }}
          >
            {[
              [
                "⚔️",
                player.battles.toLocaleString(),
                "BATTLES",
              ],
              [
                "🔥",
                player.streak.toLocaleString(),
                "STREAK",
              ],
              [
                "⚡",
                player.xp.toLocaleString(),
                "TOTAL XP",
              ],
              [
                "🏆",
                globalRank != null ? `#${globalRank.toLocaleString()}` : "—",
                "GLOBAL RANK",
              ],
            ].map(
              ([icon, value, label]) => (
                <div
                  className="stat-card"
                  key={label}
                  style={{
                    minWidth: 0,
                    boxSizing: "border-box",
                    padding: "15px 12px",
                    borderRadius: "15px",
                    background:
                      "rgba(255,255,255,0.045)",
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "20px",
                      marginBottom: "5px",
                    }}
                  >
                    {icon}
                  </span>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "18px",
                      lineHeight: 1.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {value}
                  </strong>

                  <small
                    style={{
                      display: "block",
                      marginTop: "5px",
                      fontSize: "9px",
                      letterSpacing: "0.05em",
                      opacity: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </small>
                </div>
              )
            )}
          </section>

          {/* EXTRA STATS */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background:
                  "rgba(255,255,255,0.035)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  opacity: 0.5,
                }}
              >
                BEST COMBO
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "4px",
                  fontSize: "16px",
                }}
              >
                🔥 {player.bestCombo}
              </strong>
            </div>

            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                background:
                  "rgba(255,255,255,0.035)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  opacity: 0.5,
                }}
              >
                BEST BATTLE XP
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "4px",
                  fontSize: "16px",
                }}
              >
                ⚡ {player.bestBattleXp}
              </strong>
            </div>
          </section>

          {/* ACHIEVEMENTS HEADER */}
          <div
            className="profile-section-title"
            style={{
              display: "flex",
              alignItems: "end",
              justifyContent: "space-between",
              gap: "10px",
              marginTop: "22px",
              marginBottom: "11px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "19px",
                  fontWeight: 900,
                }}
              >
                🏅 Achievements
              </h2>

              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  fontSize: "10px",
                  opacity: 0.45,
                }}
              >
                Complete challenges to unlock badges
              </span>
            </div>

            <strong
              style={{
                padding: "5px 9px",
                borderRadius: "999px",
                background:
                  "rgba(124,77,255,0.14)",
                fontSize: "11px",
              }}
            >
              {unlockedAchievements}/
              {achievements.length}
            </strong>
          </div>

          {/* ACHIEVEMENTS */}
          <section
            className="achievements"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "9px",
            }}
          >
            {achievements.map(
              (achievement) => {
                const progressPercent =
                  Math.min(
                    100,
                    (achievement.value /
                      achievement.target) *
                      100
                  );

                return (
                  <div
                    className={`achievement ${
                      achievement.unlocked
                        ? "unlocked"
                        : "locked"
                    }`}
                    key={achievement.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "11px",
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      borderRadius: "15px",
                      background:
                        achievement.unlocked
                          ? "rgba(124,77,255,0.12)"
                          : "rgba(255,255,255,0.035)",
                      border:
                        achievement.unlocked
                          ? "1px solid rgba(124,77,255,0.24)"
                          : "1px solid rgba(255,255,255,0.06)",
                      opacity:
                        achievement.unlocked
                          ? 1
                          : 0.78,
                    }}
                  >
                    <div
                      className="achievement-icon"
                      style={{
                        width: "43px",
                        height: "43px",
                        flex: "0 0 43px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "12px",
                        background:
                          achievement.unlocked
                            ? "rgba(124,77,255,0.18)"
                            : "rgba(255,255,255,0.06)",
                        fontSize: "20px",
                      }}
                    >
                      {achievement.unlocked
                        ? achievement.icon
                        : "🔒"}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.2,
                          }}
                        >
                          {achievement.title}
                        </strong>

                        {achievement.unlocked && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 900,
                              color: "#c4b5fd",
                            }}
                          >
                            ✓ UNLOCKED
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          display: "block",
                          marginTop: "4px",
                          fontSize: "11px",
                          lineHeight: 1.35,
                          opacity: 0.58,
                          wordBreak: "break-word",
                        }}
                      >
                        {achievement.text}
                      </span>

                      {!achievement.unlocked && (
                        <>
                          <div
                            style={{
                              marginTop: "8px",
                              height: "5px",
                              borderRadius: "999px",
                              overflow: "hidden",
                              background:
                                "rgba(255,255,255,0.08)",
                            }}
                          >
                            <div
                              style={{
                                width: `${progressPercent}%`,
                                height: "100%",
                                borderRadius: "999px",
                                background:
                                  "linear-gradient(90deg, #7c4dff, #a855f7)",
                              }}
                            />
                          </div>

                          <small
                            style={{
                              display: "block",
                              marginTop: "4px",
                              fontSize: "9px",
                              opacity: 0.42,
                            }}
                          >
                            {achievement.value.toLocaleString()}
                            {" / "}
                            {achievement.target.toLocaleString()}
                          </small>
                        </>
                      )}
                    </div>

                    {achievement.unlocked && (
                      <div
                        style={{
                          flex: "0 0 auto",
                          fontSize: "18px",
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </section>
        </main>

        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // RANKING
  // ==========================================

  if (screen === "ranking") {
    const currentName =
      telegramUser?.first_name ||
      "Sergio";

    const worldPlayers = leaderboard.length
      ? leaderboard.map((user, index) => [
          user.first_name || user.username || "Player",
          Number(user.xp || 0).toLocaleString(),
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "",
          "—",
          Number(user.level || 1),
          Number(user.globalRank || index + 1),
        ])
      : [
          [currentName, player.xp.toLocaleString(), "", "—", levelInfo.level, globalRank || 1],
        ];

    // Friends are intentionally not mocked anymore.
    // A real Friends tab will use the friend system once it is connected.
    const friendPlayers = [
      [
        currentName,
        player.xp.toLocaleString(),
        "",
        "—",
        levelInfo.level,
        globalRank || 1,
      ],
    ];

    const sourcePlayers =
      rankingTab === "world"
        ? worldPlayers
        : friendPlayers;

    const filteredPlayers =
      rankingSearch.trim().length === 0
        ? sourcePlayers
        : sourcePlayers.filter(
            ([name]) =>
              name
                .toLowerCase()
                .includes(
                  rankingSearch
                    .trim()
                    .toLowerCase()
                )
          );

    const topThree =
      rankingTab === "world" &&
      rankingSearch.trim().length === 0
        ? worldPlayers.slice(0, 3)
        : [];

    return (
      <div className="app">
        <div className="glow glow-one" />

        <Header />

        <main className="ranking-page" style={{ paddingBottom: "96px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.22)",
                  color: "#d8b4fe",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  marginBottom: "10px",
                }}
              >
                🏆 LEADERBOARD
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "27px",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                {rankingTab === "world"
                  ? "Global Ranking"
                  : "Friends Ranking"}
              </h1>
              <p
                style={{
                  margin: "7px 0 0",
                  opacity: 0.58,
                  fontSize: "12px",
                }}
              >
                {rankingTab === "world"
                  ? "Compete with players worldwide"
                  : "See how you compare with your friends"}
              </p>
            </div>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(145deg, rgba(168,85,247,0.28), rgba(88,28,135,0.18))",
                border: "1px solid rgba(192,132,252,0.28)",
                boxShadow: "0 10px 30px rgba(76,29,149,0.22)",
                fontSize: "23px",
                flexShrink: 0,
              }}
            >
              👑
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              padding: "5px",
              borderRadius: "15px",
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: "12px",
            }}
          >
            {[
              ["world", "🌍", "World"],
              ["friends", "👥", "Friends"],
            ].map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => {
                  setRankingTab(tab as "world" | "friends");
                  setRankingSearch("");
                  setChallengeNotice("");
                }}
                style={{
                  border: "0",
                  borderRadius: "11px",
                  padding: "10px 8px",
                  background:
                    rankingTab === tab
                      ? "linear-gradient(135deg, rgba(124,77,255,0.42), rgba(168,85,247,0.24))"
                      : "transparent",
                  color: "inherit",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow:
                    rankingTab === tab
                      ? "inset 0 0 0 1px rgba(192,132,252,0.18)"
                      : "none",
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <div
            style={{
              position: "relative",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "13px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.55,
                fontSize: "15px",
              }}
            >
              🔎
            </span>
            <input
              value={rankingSearch}
              onChange={(event) =>
                setRankingSearch(event.target.value)
              }
              placeholder="Search player..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px 12px 38px",
                borderRadius: "13px",
                border: "1px solid rgba(255,255,255,0.09)",
                background: "rgba(13,10,27,0.72)",
                color: "inherit",
                outline: "none",
                fontSize: "13px",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            />
          </div>

          {challengeNotice && (
            <div
              style={{
                marginBottom: "12px",
                padding: "11px 13px",
                borderRadius: "13px",
                background: "rgba(124,77,255,0.14)",
                border: "1px solid rgba(168,85,247,0.25)",
                fontSize: "11px",
                lineHeight: 1.4,
              }}
            >
              {challengeNotice}
            </div>
          )}

          {topThree.length === 3 && (
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.12fr 1fr",
                alignItems: "end",
                gap: "7px",
                margin: "10px 0 14px",
              }}
            >
              {topThree.map(
                ([name, xp, medal], index) => {
                  const heights = ["126px", "150px", "114px"];
                  const isCurrentPlayer =
                    name === currentName;

                  return (
                    <div
                      key={`podium-${name}`}
                      style={{
                        minWidth: 0,
                        height: heights[index],
                        borderRadius: "17px 17px 12px 12px",
                        padding: "12px 7px 9px",
                        boxSizing: "border-box",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        background:
                          index === 1
                            ? "linear-gradient(180deg, rgba(168,85,247,0.27), rgba(124,77,255,0.08))"
                            : "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
                        border:
                          index === 1
                            ? "1px solid rgba(192,132,252,0.38)"
                            : "1px solid rgba(255,255,255,0.09)",
                        boxShadow:
                          index === 1
                            ? "0 14px 35px rgba(124,77,255,0.18)"
                            : "0 10px 25px rgba(0,0,0,0.18)",
                      }}
                    >
                      <div style={{ fontSize: index === 1 ? "25px" : "21px", marginBottom: "5px" }}>
                        {medal}
                      </div>
                      <div
                        style={{
                          width: index === 1 ? "48px" : "42px",
                          height: index === 1 ? "48px" : "42px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(8,8,18,0.72)",
                          border: "2px solid rgba(192,132,252,0.28)",
                          fontSize: index === 1 ? "22px" : "19px",
                          marginBottom: "7px",
                        }}
                      >
                        {isCurrentPlayer ? "😎" : ["🧑", "👨", "👽"][index]}
                      </div>
                      <strong
                        style={{
                          fontSize: "11px",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </strong>
                      <span
                        style={{
                          marginTop: "3px",
                          fontSize: "10px",
                          fontWeight: 800,
                          opacity: 0.78,
                        }}
                      >
                        {xp} XP
                      </span>
                      {index === 1 && (
                        <span
                          style={{
                            marginTop: "5px",
                            fontSize: "8px",
                            letterSpacing: "0.08em",
                            color: "#d8b4fe",
                            fontWeight: 900,
                          }}
                        >
                          #2
                        </span>
                      )}
                    </div>
                  );
                }
              )}
            </section>
          )}

          {rankingTab === "friends" && (
            <div
              style={{
                marginBottom: "12px",
                padding: "11px 13px",
                borderRadius: "13px",
                background: "rgba(124,77,255,0.10)",
                border: "1px solid rgba(168,85,247,0.18)",
                fontSize: "10px",
                lineHeight: 1.4,
                opacity: 0.72,
              }}
            >
              👥 Friends ranking will appear after the friend system is connected.
            </div>
          )}

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "7px",
            }}
          >
            {filteredPlayers.map(
              ([name, xp, _medal, movement, level, rank], index) => {
                const isCurrentPlayer =
                  name === currentName;

                // Hide rows duplicated by the podium only when the podium
                // actually exists. With 1–2 players we still need to render
                // the real player rows below the search field.
                const isTopThree =
                  topThree.length === 3 &&
                  rankingTab === "world" &&
                  index < 3 &&
                  rankingSearch.trim().length === 0;

                if (isTopThree) return null;

                return (
                  <div
                    key={`${name}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                      padding: "10px 10px",
                      borderRadius: "15px",
                      background: isCurrentPlayer
                        ? "linear-gradient(90deg, rgba(124,77,255,0.22), rgba(168,85,247,0.08))"
                        : "rgba(255,255,255,0.045)",
                      border: isCurrentPlayer
                        ? "1px solid rgba(168,85,247,0.34)"
                        : "1px solid rgba(255,255,255,0.065)",
                      boxShadow: isCurrentPlayer
                        ? "0 8px 25px rgba(76,29,149,0.16)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "27px",
                        textAlign: "center",
                        fontSize: "10px",
                        fontWeight: 900,
                        opacity: 0.6,
                        flexShrink: 0,
                      }}
                    >
                      #{rank ?? index + 1}
                    </div>

                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(8,8,18,0.7)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      {isCurrentPlayer
                        ? "😎"
                        : ["🧑", "👨", "👽", "🤠", "🦊"][index] || "👤"}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "12px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </strong>
                        {isCurrentPlayer && (
                          <span
                            style={{
                              padding: "3px 6px",
                              borderRadius: "999px",
                              background: "rgba(168,85,247,0.18)",
                              color: "#d8b4fe",
                              fontSize: "7px",
                              fontWeight: 900,
                              letterSpacing: "0.07em",
                              flexShrink: 0,
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          display: "block",
                          marginTop: "3px",
                          fontSize: "9px",
                          opacity: 0.45,
                          fontWeight: 700,
                        }}
                      >
                        LEVEL {isCurrentPlayer ? levelInfo.level : Number(level || 1)}
                      </span>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          fontSize: "12px",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {xp}
                      </strong>
                      <span
                        style={{
                          fontSize: "8px",
                          opacity: 0.45,
                          fontWeight: 800,
                        }}
                      >
                        XP
                      </span>
                    </div>

                    <span
                      style={{
                        minWidth: "25px",
                        textAlign: "center",
                        fontSize: "9px",
                        fontWeight: 900,
                        color:
                          movement.startsWith("+")
                            ? "#86efac"
                            : movement.startsWith("−")
                            ? "#fca5a5"
                            : "inherit",
                        opacity: movement === "—" ? 0.35 : 1,
                      }}
                    >
                      {movement}
                    </span>

                    {rankingTab === "friends" &&
                      !isCurrentPlayer && (
                        <button
                          onClick={() => handleChallenge(name)}
                          style={{
                            width: "31px",
                            height: "31px",
                            border: "1px solid rgba(168,85,247,0.22)",
                            borderRadius: "10px",
                            background: "rgba(124,77,255,0.14)",
                            color: "inherit",
                            fontSize: "13px",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          ⚔️
                        </button>
                      )}
                  </div>
                );
              }
            )}

            {filteredPlayers.length === 0 && (
              <div
                style={{
                  padding: "34px 12px",
                  textAlign: "center",
                  borderRadius: "15px",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  opacity: 0.65,
                  fontSize: "12px",
                }}
              >
                No players found.
              </div>
            )}
          </section>

          <div
            style={{
              marginTop: "14px",
              padding: "14px",
              borderRadius: "17px",
              background:
                "linear-gradient(135deg, rgba(124,77,255,0.18), rgba(168,85,247,0.06))",
              border: "1px solid rgba(168,85,247,0.22)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "13px",
                display: "grid",
                placeItems: "center",
                background: "rgba(8,8,18,0.45)",
                fontSize: "19px",
                flexShrink: 0,
              }}
            >
              📈
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "8px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  opacity: 0.5,
                }}
              >
                {rankingTab === "world" ? "YOUR GLOBAL RANK" : "YOUR FRIEND RANK"}
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: "2px",
                  fontSize: "23px",
                  lineHeight: 1,
                }}
              >
                #{rankingTab === "world" ? (globalRank?.toLocaleString() ?? "—") : "1"}
              </strong>
            </div>
            <span
              style={{
                fontSize: "9px",
                lineHeight: 1.35,
                opacity: 0.58,
                maxWidth: "105px",
                textAlign: "right",
              }}
            >
              {rankingTab === "world"
                ? "Keep playing to climb higher ⚡"
                : "Challenge your friends ⚔️"}
            </span>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // RESULT
  // ==========================================

  if (screen === "result") {
    const newLevelInfo =
      getLevelInfo(
        player.xp
      );

    const leveledUp =
      newLevelInfo.level >
      previousLevelInfo.level;

    return (
      <div className="app">
        <main className="result-screen">
          <div className="result-icon">
            {leveledUp
              ? "🆙"
              : "🏆"}
          </div>

          <span className="result-label">
            {leveledUp
              ? "LEVEL UP!"
              : "BATTLE COMPLETE"}
          </span>

          <h1>
            {leveledUp
              ? `LEVEL ${newLevelInfo.level}`
              : "Great job!"}
          </h1>

          <div className="score-circle">
            <strong>
              {score}/
              {gameQuestions.length}
            </strong>

            <span>
              correct
            </span>
          </div>

          <div className="result-stats">
            <div>
              <strong>
                +{battleXp}
              </strong>

              <span>
                XP earned
              </span>
            </div>

            <div>
              <strong>
                🔥{" "}
                {Math.max(
                  player.bestCombo,
                  battleCombo
                )}
              </strong>

              <span>
                best combo
              </span>
            </div>

            <div>
              <strong>
                {player.streak}
              </strong>

              <span>
                day streak
              </span>
            </div>
          </div>

          <button
            className="play-button"
            onClick={startBattle}
          >
            ⚔️ PLAY AGAIN

            <span className="arrow">
              →
            </span>
          </button>

          <button
            className="secondary-button"
            onClick={() =>
              setScreen("home")
            }
          >
            ← BACK TO HOME
          </button>
        </main>
      </div>
    );
  }

  // ==========================================
  // BATTLE
  // ==========================================

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="app">
      <main className="battle-screen">
        <div className="battle-header">
          <button
            className="back-button"
            onClick={() =>
              setScreen("home")
            }
          >
            ←
          </button>

          <div className="battle-title">
            <strong>
              DAILY BATTLE
            </strong>

            <span>
              {questionIndex + 1} /{" "}
              {gameQuestions.length}
            </span>
          </div>

          <div
            className="timer"
            style={{
              color:
                timeLeft <= 10
                  ? "#ff7187"
                  : undefined,

              background:
                timeLeft <= 10
                  ? "rgba(255,90,115,0.12)"
                  : undefined,
            }}
          >
            {timeLeft}
          </div>
        </div>

        <div className="question-progress">
          <div
            style={{
              width: `${
                ((questionIndex + 1) /
                  gameQuestions.length) *
                100
              }%`,
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "8px",
            margin: "12px 0 14px",
          }}
        >
          <div
            style={{
              padding: "9px 7px",
              borderRadius: "11px",
              background:
                "rgba(255,255,255,0.045)",
              border:
                "1px solid rgba(255,255,255,0.07)",
              textAlign: "center",
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "15px",
              }}
            >
              {score}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "2px",
                fontSize: "9px",
                opacity: 0.5,
              }}
            >
              CORRECT
            </span>
          </div>

          <div
            style={{
              padding: "9px 7px",
              borderRadius: "11px",
              background:
                battleCombo >= 3
                  ? "rgba(255,153,0,0.12)"
                  : "rgba(255,255,255,0.045)",
              border:
                battleCombo >= 3
                  ? "1px solid rgba(255,153,0,0.25)"
                  : "1px solid rgba(255,255,255,0.07)",
              textAlign: "center",
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "15px",
              }}
            >
              🔥 {battleCombo}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "2px",
                fontSize: "9px",
                opacity: 0.5,
              }}
            >
              COMBO
            </span>
          </div>

          <div
            style={{
              padding: "9px 7px",
              borderRadius: "11px",
              background:
                "rgba(124,77,255,0.10)",
              border:
                "1px solid rgba(124,77,255,0.20)",
              textAlign: "center",
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: "15px",
              }}
            >
              +{battleXp}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "2px",
                fontSize: "9px",
                opacity: 0.5,
              }}
            >
              XP
            </span>
          </div>
        </div>

        {battleCombo >= 3 && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 10px",
              borderRadius: "10px",
              textAlign: "center",
              background:
                "rgba(255,153,0,0.10)",
              border:
                "1px solid rgba(255,153,0,0.18)",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            🔥 COMBO x
            {Math.min(
              3,
              1 +
                Math.floor(
                  battleCombo / 3
                )
            )}
            {" — "}
            Keep the streak going!
          </div>
        )}

        <section className="question-card">
          <div className="question-number">
            QUESTION{" "}
            {questionIndex + 1}
          </div>

          <h1>
            {currentQuestion.question}
          </h1>

          <p>
            Choose the correct
            answer
          </p>
        </section>

        <div className="answers">
          {currentQuestion.answers.map(
            (answer, index) => {
              let className =
                "answer-button";

              if (
                selectedAnswer !==
                null
              ) {
                if (
                  answer.correct
                ) {
                  className +=
                    " correct";
                } else if (
                  index ===
                  selectedAnswer
                ) {
                  className +=
                    " wrong";
                }
              }

              return (
                <button
                  key={answer.text}
                  className={
                    className
                  }
                  disabled={
                    selectedAnswer !==
                    null
                  }
                  onClick={() =>
                    answerQuestion(
                      index
                    )
                  }
                >
                  <span className="answer-letter">
                    {String.fromCharCode(
                      65 + index
                    )}
                  </span>

                  <span>
                    {answer.text}
                  </span>

                  {selectedAnswer !==
                    null &&
                    answer.correct && (
                      <span className="answer-result">
                        ✓
                      </span>
                    )}

                  {selectedAnswer !==
                    null &&
                    index ===
                      selectedAnswer &&
                    !answer.correct && (
                      <span className="answer-result">
                        ×
                      </span>
                    )}
                </button>
              );
            }
          )}
        </div>

        <div className="battle-footer">
          <span>
            🔥 {player.streak} day
            streak
          </span>

          <span>
            {selectedAnswer !== null
              ? "Next question..."
              : "Choose an answer"}
          </span>

          <span>
            +{battleXp} XP
          </span>
        </div>
      </main>
    </div>
  );
}

export default App;