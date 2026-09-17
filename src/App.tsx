import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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
  | "result"
  | "pvp"
  | "pvp_battle"
  | "pvp_result"
  | "pvp_stats";

type Answer = {
  text: string;
  correct: boolean;
};

type Question = {
  question: string;
  answers: Answer[];
};

type QuestionResult = "correct" | "wrong" | "timeout";

type PvpQuestion = {
  id: number;
  question: string;
  answers: string[];
  category?: string;
  difficulty?: string;
};

type PvpMatch = {
  matchId: number;
  status: "waiting" | "ready" | "finished";
  startedAt?: string | null;
  opponent?: {
    telegram_id: string;
    username?: string | null;
    first_name?: string | null;
    xp?: number;
    level?: number;
  } | null;
};


type PlayerData = {
  xp: number;
  streak: number;
  battles: number;
  totalCorrect: number;
  bestCombo: number;
  bestBattleXp: number;
};

type ShopProduct = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  category: string;
  price_stars: number;
  enabled?: number;
  featured?: boolean;
};

type InventoryItem = {
  product_id: string;
  quantity: number;
  equipped: number;
  title: string;
  description?: string;
  icon?: string;
  category: string;
  price_stars: number;
};

const SHOP_FALLBACK: ShopProduct[] = [
  { id: "custom_avatar", icon: "🖼️", title: "Custom Avatar", description: "Use your own profile picture", price_stars: 50, category: "PROFILE", featured: true },
  { id: "neon_frame", icon: "🟣", title: "Neon Frame", description: "Stand out in the ranking", price_stars: 25, category: "PROFILE" },
  { id: "fire_frame", icon: "🔥", title: "Fire Frame", description: "Bring the heat to your profile", price_stars: 50, category: "PROFILE" },
  { id: "legendary_frame", icon: "👑", title: "Legendary Frame", description: "Premium profile frame", price_stars: 100, category: "PROFILE" },
  { id: "second_chance", icon: "❤️", title: "Second Chance", description: "One extra life in a battle", price_stars: 15, category: "BATTLE" },
  { id: "combo_shield", icon: "🛡️", title: "Combo Shield", description: "Protect your combo from one mistake", price_stars: 30, category: "BATTLE" },
  { id: "xp_boost", icon: "⚡", title: "XP Boost", description: "Boost your battle progression", price_stars: 25, category: "BATTLE" },
  { id: "battle_pass", icon: "🎟️", title: "Battle Pass", description: "Unlock exclusive season rewards", price_stars: 299, category: "PASS", featured: true },
];

const PROFILE_FRAME_EMOJI: Record<string, string> = {
  neon_frame: "🟣",
  fire_frame: "🔥",
  legendary_frame: "👑",
};

const FRAME_STYLES: Record<string, CSSProperties> = {
  neon_frame: { border: "2px solid rgba(124,77,255,0.95)", boxShadow: "0 0 0 3px rgba(124,77,255,0.16), 0 0 24px rgba(124,77,255,0.42)" },
  fire_frame: { border: "2px solid rgba(255,110,60,0.95)", boxShadow: "0 0 0 3px rgba(255,110,60,0.14), 0 0 24px rgba(255,110,60,0.34)" },
  legendary_frame: { border: "2px solid rgba(255,205,70,0.95)", boxShadow: "0 0 0 3px rgba(255,205,70,0.14), 0 0 28px rgba(255,205,70,0.36)" },
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

function getLevelTitle(level: number) {
  if (level >= 50) return "MASTERMIND";
  if (level >= 30) return "GENIUS";
  if (level >= 20) return "BRAIN";
  if (level >= 10) return "THINKER";
  if (level >= 5) return "LEARNER";
  return "ROOKIE";
}

function getNextMilestone(level: number) {
  const milestones = [5, 10, 15, 20, 30, 50];
  return milestones.find((item) => item > level) ?? null;
}

function getMilestoneReward(level: number) {
  const rewards: Record<number, string> = {
    5: "🎖️ Learner Badge",
    10: "🟣 Special Profile Frame",
    15: "⚡ XP Boost",
    20: "🔥 Exclusive Badge",
    30: "👑 Elite Profile Badge",
    50: "💎 Mastermind Badge",
  };
  return rewards[level] ?? "🎁 Progression Reward";
}

type DailyMissionStats = {
  date: string;
  battles: number;
  correct: number;
  bestCombo: number;
  xpEarned: number;
  claimed: string[];
};

type WeeklyMissionStats = {
  periodKey: string;
  battles: number;
  correct: number;
  bestCombo: number;
  xpEarned: number;
  claimed: string[];
};

const DAILY_MISSIONS = [
  { id: "battle_1", icon: "⚔️", title: "Warm Up", description: "Complete 1 battle today", target: 1, reward: 50, getProgress: (s: DailyMissionStats) => s.battles },
  { id: "correct_15", icon: "🧠", title: "Sharp Mind", description: "Answer 15 questions correctly", target: 15, reward: 75, getProgress: (s: DailyMissionStats) => s.correct },
  { id: "combo_5", icon: "🔥", title: "On Fire", description: "Reach a 5-answer combo", target: 5, reward: 75, getProgress: (s: DailyMissionStats) => s.bestCombo },
  { id: "xp_300", icon: "⚡", title: "XP Hunter", description: "Earn 300 XP from battles", target: 300, reward: 100, getProgress: (s: DailyMissionStats) => s.xpEarned },
];

const WEEKLY_MISSIONS = [
  { id: "battle_7", icon: "🏹", title: "Weekly Warrior", description: "Complete 7 battles this week", target: 7, reward: 250, getProgress: (s: WeeklyMissionStats) => s.battles },
  { id: "correct_60", icon: "🧠", title: "Deep Thinker", description: "Answer 60 questions correctly", target: 60, reward: 300, getProgress: (s: WeeklyMissionStats) => s.correct },
  { id: "combo_8", icon: "🔥", title: "Combo Master", description: "Reach an 8-answer combo", target: 8, reward: 300, getProgress: (s: WeeklyMissionStats) => s.bestCombo },
  { id: "xp_1500", icon: "⚡", title: "XP Machine", description: "Earn 1,500 XP from battles", target: 1500, reward: 400, getProgress: (s: WeeklyMissionStats) => s.xpEarned },
];

function emptyDailyMissionStats(): DailyMissionStats {
  return { date: "", battles: 0, correct: 0, bestCombo: 0, xpEarned: 0, claimed: [] };
}

function emptyWeeklyMissionStats(): WeeklyMissionStats {
  return { periodKey: "", battles: 0, correct: 0, bestCombo: 0, xpEarned: 0, claimed: [] };
}

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

  const [pvpMatch, setPvpMatch] =
    useState<PvpMatch | null>(null);

  const [pvpSearching, setPvpSearching] =
    useState(false);

  const [pvpError, setPvpError] =
    useState("");

  const [pvpQuestions, setPvpQuestions] =
    useState<PvpQuestion[]>([]);

  const [pvpQuestionIndex, setPvpQuestionIndex] =
    useState(0);

  const [pvpSelectedAnswer, setPvpSelectedAnswer] =
    useState<number | null>(null);

  const [pvpScore, setPvpScore] =
    useState(0);

  const [pvpQuestionTimeLeft, setPvpQuestionTimeLeft] =
    useState(8);

  const [pvpSubmitting, setPvpSubmitting] =
    useState(false);

  const [pvpMyFinished, setPvpMyFinished] =
    useState(false);

  const [pvpWinner, setPvpWinner] =
    useState<number | null | undefined>(undefined);

  const [pvpStats, setPvpStats] = useState<any>(null);
  const [pvpHistory, setPvpHistory] = useState<any[]>([]);
  const [pvpLeaderboard, setPvpLeaderboard] = useState<any[]>([]);
  const [pvpStatsLoading, setPvpStatsLoading] = useState(false);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [dailyMissions, setDailyMissions] = useState<DailyMissionStats>(emptyDailyMissionStats());

  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMissionStats>(emptyWeeklyMissionStats());

  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionNotice, setMissionNotice] = useState("");

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

  const [shopProducts, setShopProducts] =
    useState<ShopProduct[]>(SHOP_FALLBACK);

  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [shopLoading, setShopLoading] =
    useState(false);

  const [shopBusy, setShopBusy] =
    useState<string | null>(null);

  const [equippedFrame, setEquippedFrame] =
    useState<string | null>(null);

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

  // Battle 3.0: per-question timer + lives.
  const [questionTimeLeft, setQuestionTimeLeft] =
    useState(8);

  const [battleLives, setBattleLives] =
    useState(3);

  const [secondChanceAvailable, setSecondChanceAvailable] =
    useState(false);

  const [comboShieldAvailable, setComboShieldAvailable] =
    useState(false);

  const [xpBoostActive, setXpBoostActive] =
    useState(false);

  const [boosterPickerOpen, setBoosterPickerOpen] =
    useState(false);

  const [selectedSecondChance, setSelectedSecondChance] =
    useState(false);

  const [selectedComboShield, setSelectedComboShield] =
    useState(false);

  const [selectedXpBoost, setSelectedXpBoost] =
    useState(false);

  const [questionResults, setQuestionResults] =
    useState<QuestionResult[]>([]);

  const [livesLost, setLivesLost] =
    useState(0);

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

  const levelTitle = getLevelTitle(levelInfo.level);
  const nextMilestone = getNextMilestone(levelInfo.level);
  const milestoneReward = nextMilestone
    ? getMilestoneReward(nextMilestone)
    : "💎 All major milestones reached";

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

        if (remote.frame) {
          const frameId = remote.frame === "neon" ? "neon_frame" : remote.frame === "fire" ? "fire_frame" : remote.frame === "legendary" ? "legendary_frame" : null;
          setEquippedFrame(frameId);
        }

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

  // Exact current player returned by D1 /api/ranking.
  // Needed so a player outside the top 100 is still visible in the UI.
  const [leaderboardMe, setLeaderboardMe] =
    useState<any | null>(null);

  const [friends, setFriends] =
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
        setLeaderboardMe(data.me || null);

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

  // ==========================================
  // LOAD REAL FRIENDS
  // ==========================================
  useEffect(() => {
    let cancelled = false;

    const loadFriends = async () => {
      try {
        const tg = getTelegramWebApp();
        const initData = tg?.initData || "";

        if (!initData) return;

        const response = await fetch(`${API_BASE}/api/friends`, {
          headers: {
            Accept: "application/json",
            Authorization: `tma ${initData}`,
          },
        });

        const data = await response.json();
        if (!response.ok || !data?.ok || cancelled) return;

        setFriends(Array.isArray(data.friends) ? data.friends : []);
      } catch (error) {
        console.warn("BATTLE IQ: friends sync failed", error);
      }
    };

    loadFriends();

    return () => {
      cancelled = true;
    };
  }, [player.xp, player.battles]);

  // ==========================================
  // SERVER-AUTHORITATIVE MISSIONS
  // ==========================================
  const loadMissions = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    setMissionsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/missions`, {
        headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Mission sync failed");
      setDailyMissions(data.daily || emptyDailyMissionStats());
      setWeeklyMissions(data.weekly || emptyWeeklyMissionStats());
    } catch (error) {
      console.warn("BATTLE IQ: missions sync failed", error);
    } finally {
      setMissionsLoading(false);
    }
  };

  useEffect(() => {
    void loadMissions();
  }, [telegramUser?.id, player.battles, player.xp]);

  // ==========================================
  // SHOP + INVENTORY
  // ==========================================
  useEffect(() => {
    let cancelled = false;

    const loadShop = async () => {
      setShopLoading(true);
      try {
        const productsResponse = await fetch(`${API_BASE}/api/shop`);
        const productsData = await productsResponse.json();
        if (!cancelled && productsResponse.ok && productsData?.ok && Array.isArray(productsData.products)) {
          setShopProducts(productsData.products);
        }

        const tg = getTelegramWebApp();
        if (!tg?.initData) return;

        const inventoryResponse = await fetch(`${API_BASE}/api/inventory`, {
          headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
        });
        const inventoryData = await inventoryResponse.json();
        if (!cancelled && inventoryResponse.ok && inventoryData?.ok && Array.isArray(inventoryData.items)) {
          setInventory(inventoryData.items);
          const active = inventoryData.items.find((item: InventoryItem) => Number(item.equipped) === 1);
          if (active) setEquippedFrame(active.product_id);
        }
      } catch (error) {
        console.warn("BATTLE IQ: shop sync failed", error);
      } finally {
        if (!cancelled) setShopLoading(false);
      }
    };

    loadShop();
    return () => { cancelled = true; };
  }, [telegramUser?.id]);

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
  // PER-QUESTION TIMER / LIVES
  // ==========================================

  useEffect(() => {
    if (screen !== "battle") return;
    if (battleFinished) return;
    if (!currentQuestion) return;
    if (selectedAnswer !== null) return;

    if (questionTimeLeft <= 0) {
      handleQuestionTimeout();
      return;
    }

    const timer = window.setInterval(() => {
      setQuestionTimeLeft((value) => value - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    screen,
    battleFinished,
    questionIndex,
    selectedAnswer,
    questionTimeLeft,
  ]);

  // ==========================================
  // INVENTORY CONSUMPTION
  // ==========================================

  const consumeInventoryItem = async (productId: string) => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return false;

    try {
      const response = await fetch(`${API_BASE}/api/inventory/consume`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ productId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) return false;

      setInventory((items) =>
        items
          .map((item) =>
            item.product_id === productId
              ? { ...item, quantity: Number(data.quantity ?? Math.max(0, Number(item.quantity) - 1)) }
              : item
          )
          .filter((item) => Number(item.quantity) > 0)
      );
      return true;
    } catch (error) {
      console.warn(`BATTLE IQ: failed to consume ${productId}`, error);
      return false;
    }
  };

  // ==========================================
  // START BATTLE
  // ==========================================

  const launchBattle = async () => {
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

    // Activate only the boosters selected in the pre-battle panel.
    setSecondChanceAvailable(selectedSecondChance);
    setComboShieldAvailable(selectedComboShield);
    setXpBoostActive(false);

    if (selectedXpBoost) {
      const consumed = await consumeInventoryItem("xp_boost");
      if (consumed) {
        setXpBoostActive(true);
        setChallengeNotice("⚡ XP BOOST активовано: +50% XP");
        window.setTimeout(() => setChallengeNotice(""), 1800);
      }
    }

    setGameQuestions(
      preparedQuestions
    );

    setQuestionIndex(0);
    setScore(0);
    setBattleXp(0);
    setBattleCombo(0);
    setSelectedAnswer(null);
    setTimeLeft(60);
    setQuestionTimeLeft(8);
    setBattleLives(3);
    setQuestionResults([]);
    setLivesLost(0);
    setBattleFinished(false);
    setBoosterPickerOpen(false);
    setSelectedSecondChance(false);
    setSelectedComboShield(false);
    setSelectedXpBoost(false);

    setScreen("battle");
  };

  const startBattle = () => {
    const battleBoosters = [
      "second_chance",
      "combo_shield",
      "xp_boost",
    ];

    const ownedBattleBoosters = inventory.filter((item) =>
      battleBoosters.includes(item.product_id) && Number(item.quantity || 0) > 0
    );

    if (ownedBattleBoosters.length === 0) {
      void launchBattle();
      return;
    }

    setSelectedSecondChance(false);
    setSelectedComboShield(false);
    setSelectedXpBoost(false);
    setBoosterPickerOpen(true);
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

    setScreen("result");

    // Re-read mission progress from D1 after the battle is recorded.
    window.setTimeout(() => { void loadMissions(); }, 250);
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
    setQuestionTimeLeft(8);
  };

  // ==========================================
  // QUESTION TIMEOUT
  // ==========================================

  const handleQuestionTimeout = async () => {
    if (!currentQuestion) return;
    if (selectedAnswer !== null) return;

    const webApp = getTelegramWebApp();

    webApp?.HapticFeedback?.notificationOccurred("error");
    setSelectedAnswer(-1);
    setBattleCombo(0);
    setQuestionResults((current) => [...current, "timeout"]);
    setLivesLost((current) => current + 1);

    const nextLives = battleLives - 1;

    if (nextLives <= 0) {
      if (secondChanceAvailable) {
        const restored = await consumeInventoryItem("second_chance");
        if (restored) {
          setSecondChanceAvailable(false);
          setBattleLives(1);
          setChallengeNotice("❤️ SECOND CHANCE! +1 life");
          window.setTimeout(() => setChallengeNotice(""), 1500);

          window.setTimeout(() => {
            nextQuestion();
          }, 700);
          return;
        }
        setSecondChanceAvailable(false);
      }

      setBattleLives(0);
      window.setTimeout(() => finishBattle(), 350);
      return;
    }

    setBattleLives(nextLives);

    window.setTimeout(() => {
      nextQuestion();
    }, 700);
  };

  // ==========================================
  // ANSWER
  // ==========================================

  const answerQuestion = async (
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

      setQuestionResults((current) => [
        ...current,
        "correct",
      ]);

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

      const baseEarnedXp =
        (50 + speedBonus) *
        comboMultiplier;

      const earnedXp = xpBoostActive
        ? Math.ceil(baseEarnedXp * 1.5)
        : baseEarnedXp;

      setBattleXp(
        (value) =>
          value + earnedXp
      );
    } else {
      webApp?.HapticFeedback?.notificationOccurred(
        "error"
      );

      setQuestionResults((current) => [
        ...current,
        "wrong",
      ]);

      // Combo Shield is consumed only when a real mistake happens.
      if (comboShieldAvailable) {
        const protectedCombo = await consumeInventoryItem("combo_shield");
        if (protectedCombo) {
          setComboShieldAvailable(false);
          setChallengeNotice("🛡️ COMBO SHIELD! Комбо збережено");
          window.setTimeout(() => setChallengeNotice(""), 1500);
        } else {
          setBattleCombo(0);
        }
      } else {
        setBattleCombo(0);
      }

      setLivesLost((current) => current + 1);

      const nextLives = battleLives - 1;

      if (nextLives <= 0) {
        if (secondChanceAvailable) {
          const restored = await consumeInventoryItem("second_chance");
          if (restored) {
            setSecondChanceAvailable(false);
            setBattleLives(1);
            setChallengeNotice("❤️ SECOND CHANCE! +1 life");
            window.setTimeout(() => setChallengeNotice(""), 1500);
          } else {
            setSecondChanceAvailable(false);
            setBattleLives(0);
            window.setTimeout(() => finishBattle(), 350);
            return;
          }
        } else {
          setBattleLives(0);
          window.setTimeout(() => finishBattle(), 350);
          return;
        }
      } else {
        setBattleLives(nextLives);
      }
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

  const startPvpSearch = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) {
      setPvpError("Відкрий BATTLE IQ через Telegram.");
      return;
    }

    setPvpError("");
    setPvpSearching(true);
    setPvpMatch(null);
    setScreen("pvp");

    try {
      const response = await fetch(`${API_BASE}/api/pvp/queue`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Не вдалося знайти суперника");
      }
      setPvpMatch(data.match);
      setPvpSearching(data.match?.status === "waiting");
    } catch (error) {
      setPvpSearching(false);
      setPvpError(error instanceof Error ? error.message : "Помилка пошуку");
    }
  };

  useEffect(() => {
    if (screen !== "pvp" || !pvpMatch?.matchId || pvpMatch.status !== "waiting") return;

    const tg = getTelegramWebApp();
    if (!tg?.initData) return;

    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/pvp/match?id=${pvpMatch.matchId}`, {
          headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) return;
        setPvpMatch(data.match);
        if (data.match?.status === "ready") {
          setPvpSearching(false);
          getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
        }
      } catch {}
    }, 2000);

    return () => window.clearInterval(poll);
  }, [screen, pvpMatch?.matchId, pvpMatch?.status]);

  const loadPvpStats = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    setPvpStatsLoading(true);
    try {
      const headers = { Authorization: `tma ${tg.initData}`, Accept: "application/json" };
      const [statsRes, historyRes, leaderboardRes] = await Promise.all([
        fetch(`${API_BASE}/api/pvp/stats`, { headers }),
        fetch(`${API_BASE}/api/pvp/history?limit=10`, { headers }),
        fetch(`${API_BASE}/api/pvp/leaderboard?limit=20`, { headers }),
      ]);
      const [statsData, historyData, leaderboardData] = await Promise.all([
        statsRes.json(), historyRes.json(), leaderboardRes.json(),
      ]);
      if (statsRes.ok && statsData?.ok) setPvpStats(statsData.stats);
      if (historyRes.ok && historyData?.ok) setPvpHistory(Array.isArray(historyData.matches) ? historyData.matches : []);
      if (leaderboardRes.ok && leaderboardData?.ok) setPvpLeaderboard(Array.isArray(leaderboardData.players) ? leaderboardData.players : []);
    } catch (error) {
      console.warn("BATTLE IQ: PvP stats load failed", error);
    } finally {
      setPvpStatsLoading(false);
    }
  };

  const openPvpStats = async () => {
    setScreen("pvp_stats");
    await loadPvpStats();
  };

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


  useEffect(() => {
    if (screen !== "pvp_battle" || pvpMyFinished || !pvpQuestions.length) return;
    const timer = window.setInterval(() => {
      setPvpQuestionTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void submitPvpAnswer(-1);
          return 8;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, pvpQuestionIndex, pvpMyFinished, pvpQuestions.length]);


  useEffect(() => {
    if (screen !== "pvp_battle" || !pvpMatch?.matchId) return;
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;

    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/pvp/match?id=${pvpMatch.matchId}`, {
          headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) return;
        setPvpMatch(data.match);
        // The opponent can finish before us. Keep the battle screen active
        // until our own 10 answers are completed, while showing live score.
        if (data.match?.status === "finished" && pvpMyFinished) {
          setPvpWinner(data.match?.winnerUserId);
          setScreen("pvp_result");
        }
      } catch {}
    }, 1500);

    return () => window.clearInterval(poll);
  }, [screen, pvpMatch?.matchId, pvpMyFinished]);


  useEffect(() => {
    if (screen !== "pvp_result" || !pvpMatch?.matchId) return;
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/pvp/match?id=${pvpMatch.matchId}`, {
          headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) return;
        setPvpMatch(data.match);
        if (data.match?.status === "finished") {
          setPvpWinner(data.match?.winnerUserId);
          window.clearInterval(poll);
        }
      } catch {}
    }, 1000);
    return () => window.clearInterval(poll);
  }, [screen, pvpMatch?.matchId]);


  if (screen === "home") {
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <Header />

        <main className="content">
          <section className="profile-card">
            <div className="avatar" style={{ position: "relative", ...((equippedFrame && FRAME_STYLES[equippedFrame]) || {}) }}>
              😎
              {equippedFrame && <span style={{ position: "absolute", right: -6, bottom: -6, width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: "#171522", border: "1px solid rgba(255,255,255,0.12)", fontSize: 12 }}>{PROFILE_FRAME_EMOJI[equippedFrame]}</span>}
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

          <section className="challenge-card" style={{ marginTop: "12px" }}>
            <div className="challenge-left">
              <div className="mini-icon">🔥</div>
              <div>
                <strong>PLAY PVP 1V1</strong>
                <span>Знайди суперника та зіграй онлайн</span>
              </div>
            </div>
            <button className="challenge-button" onClick={startPvpSearch} type="button">
              FIND MATCH
            </button>
          </section>
        </main>

        <BottomNav />
      </div>
    );
  }

  const startPvpBattle = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData || !pvpMatch?.matchId) return;

    setPvpError("");
    try {
      const response = await fetch(`${API_BASE}/api/pvp/questions?id=${pvpMatch.matchId}`, {
        headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok || !Array.isArray(data.questions)) {
        throw new Error(data?.error || "Не вдалося завантажити PvP питання");
      }
      setPvpQuestions(data.questions);
      setPvpQuestionIndex(0);
      setPvpSelectedAnswer(null);
      setPvpScore(0);
      setPvpQuestionTimeLeft(8);
      setPvpSubmitting(false);
      setPvpMyFinished(false);
      setPvpWinner(undefined);
      setScreen("pvp_battle");
      tg.HapticFeedback?.impactOccurred("medium");
    } catch (error) {
      setPvpError(error instanceof Error ? error.message : "Помилка запуску матчу");
    }
  };

  const submitPvpAnswer = async (answerIndex: number) => {
    const tg = getTelegramWebApp();
    if (!tg?.initData || !pvpMatch?.matchId || pvpSubmitting || pvpMyFinished) return;
    const q = pvpQuestions[pvpQuestionIndex];
    if (!q) return;

    setPvpSubmitting(true);
    setPvpSelectedAnswer(answerIndex >= 0 ? answerIndex : null);

    try {
      const response = await fetch(`${API_BASE}/api/pvp/answer`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          matchId: pvpMatch.matchId,
          questionIndex: pvpQuestionIndex,
          answerIndex,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Не вдалося надіслати відповідь");

      if (data.correct) {
        tg.HapticFeedback?.notificationOccurred("success");
      } else {
        tg.HapticFeedback?.notificationOccurred("error");
      }

      setPvpScore(Number(data.score || 0));
      setPvpMatch((current) => current ? ({
        ...current,
        status: data.matchStatus || current.status,
      }) : current);

      if (data.finished) {
        setPvpMyFinished(true);
        setPvpWinner(data.winnerUserId);
        setScreen("pvp_result");
      } else {
        setPvpQuestionIndex(Number(data.nextQuestionIndex ?? pvpQuestionIndex + 1));
        setPvpSelectedAnswer(null);
        setPvpQuestionTimeLeft(8);
      }
    } catch (error) {
      setPvpError(error instanceof Error ? error.message : "Помилка відповіді");
      setPvpSelectedAnswer(null);
    } finally {
      setPvpSubmitting(false);
    }
  };

  if (screen === "pvp") {
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <section className="hero-card" style={{ textAlign: "center" }}>
            <div className="hero-badge">⚔️ PVP 1V1</div>
            <h1>{pvpMatch?.status === "ready" ? "MATCH FOUND!" : "Finding opponent..."}</h1>
            <p>
              {pvpMatch?.status === "ready"
                ? `Суперник: ${pvpMatch.opponent?.first_name || pvpMatch.opponent?.username || "Player"}`
                : "Шукаємо іншого гравця в черзі."}
            </p>
            <div style={{ margin: "24px auto", width: 110, height: 110, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(122,72,255,.16)", border: "1px solid rgba(145,105,255,.35)", fontSize: 48 }}>
              {pvpMatch?.status === "ready" ? "⚔️" : "🔎"}
            </div>
            {pvpSearching && (
              <div style={{ fontSize: 13, opacity: .7, marginBottom: 18 }}>
                Пошук триває… перевіряємо чергу кожні 2 секунди
              </div>
            )}
            {pvpError && <div style={{ color: "#ff9b9b", marginBottom: 16 }}>{pvpError}</div>}
            {pvpMatch?.status === "ready" ? (
              <button className="play-button" onClick={() => void startPvpBattle()}>
                START MATCH ⚔️
              </button>
            ) : (
              <button className="challenge-button" onClick={() => { setPvpSearching(false); setScreen("home"); }}>
                CANCEL
              </button>
            )}
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (screen === "pvp_battle") {
    const q = pvpQuestions[pvpQuestionIndex];
    const opponent = pvpMatch?.opponent;
    const opponentScore = Number((pvpMatch as any)?.opponent?.score || 0);
    const opponentFinished = Boolean((pvpMatch as any)?.opponent?.finished);
    const lead = pvpScore - opponentScore;
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <section className="hero-card" style={{ textAlign: "center" }}>
            <div className="hero-badge">⚔️ LIVE 1V1</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <div className="info-card" style={{ flex: 1, border: "1px solid rgba(139,92,246,.35)" }}>
                <strong>YOU</strong><span style={{ fontSize: 28, fontWeight: 900 }}>{pvpScore}</span><small>POINTS</small>
              </div>
              <div className="info-card" style={{ flex: 1 }}>
                <strong>{opponent?.first_name || opponent?.username || "OPPONENT"}</strong><span style={{ fontSize: 28, fontWeight: 900 }}>{opponentScore}</span><small>POINTS</small>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16, fontSize: 12, opacity: .75 }}>
              <span>{lead > 0 ? `🔥 +${lead} AHEAD` : lead < 0 ? `⚡ ${Math.abs(lead)} BEHIND` : "⚖️ TIED"}</span>
              {opponentFinished && <span>• OPPONENT FINISHED</span>}
            </div>
            <div style={{ fontSize: 13, opacity: .7, marginBottom: 8 }}>QUESTION {Math.min(pvpQuestionIndex + 1, 10)} / 10</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 16 }}>{pvpQuestionTimeLeft}s</div>
            {opponentFinished && !pvpMyFinished && (
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 12, background: "rgba(122,72,255,.12)", border: "1px solid rgba(145,105,255,.25)", fontSize: 13 }}>
                🏁 Суперник вже завершив. Дай відповідь на свої питання, щоб завершити матч.
              </div>
            )}
            {q ? (
              <>
                <div className="hero-card" style={{ marginBottom: 14 }}>
                  <h2 style={{ margin: 0 }}>{q.question}</h2>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {q.answers.map((answer, index) => (
                    <button
                      key={`${q.id}-${index}`}
                      className="challenge-button"
                      disabled={pvpSubmitting || pvpSelectedAnswer !== null}
                      onClick={() => void submitPvpAnswer(index)}
                      style={{ minHeight: 52, textAlign: "left", padding: "12px 16px", opacity: pvpSelectedAnswer !== null && pvpSelectedAnswer !== index ? .55 : 1 }}
                    >
                      <b>{String.fromCharCode(65 + index)}.</b> {answer}
                    </button>
                  ))}
                </div>
              </>
            ) : <div>Завантаження питання…</div>}
          </section>
        </main>
      </div>
    );
  }

  if (screen === "pvp_stats") {
    const stats = pvpStats || { played: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <section className="hero-card">
            <div className="hero-badge">🏆 PVP STATS</div>
            <h1>Your PvP</h1>
            <p style={{ opacity: .7 }}>Статистика, останні матчі та таблиця PvP.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 20 }}>
              {[
                ["PLAYED", stats.played], ["WINS", stats.wins], ["LOSSES", stats.losses], ["DRAWS", stats.draws],
              ].map(([label, value]) => (
                <div className="info-card" key={String(label)} style={{ padding: 10 }}>
                  <strong style={{ fontSize: 11 }}>{label}</strong>
                  <span style={{ fontSize: 24 }}>{value}</span>
                </div>
              ))}
            </div>
            <div className="info-card" style={{ marginTop: 10 }}>
              <strong>WIN RATE</strong>
              <span style={{ fontSize: 26 }}>{Number(stats.winRate || 0).toFixed(0)}%</span>
            </div>
          </section>

          <section className="hero-card">
            <div className="hero-badge">⚔️ RECENT MATCHES</div>
            {pvpStatsLoading && <p>Loading...</p>}
            {!pvpStatsLoading && pvpHistory.length === 0 && <p style={{ opacity: .65 }}>Ще немає завершених PvP матчів.</p>}
            {pvpHistory.map((match) => (
              <div key={match.matchId} className="info-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div><strong>{match.result === "win" ? "🏆 WIN" : match.result === "loss" ? "❌ LOSS" : "🤝 DRAW"}</strong><div style={{ opacity: .65, fontSize: 12 }}>vs {match.opponentName || "Opponent"}</div></div>
                <strong>{match.myScore} : {match.opponentScore}</strong>
              </div>
            ))}
          </section>

          <section className="hero-card">
            <div className="hero-badge">🏅 PVP LEADERBOARD</div>
            {pvpLeaderboard.map((player, index) => (
              <div key={player.userId} className="info-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div><strong>#{index + 1} {player.firstName || player.username || "Player"}</strong><div style={{ opacity: .65, fontSize: 12 }}>{player.wins} wins · {player.played} played</div></div>
                <strong>{player.points} PTS</strong>
              </div>
            ))}
          </section>

          <button className="play-button" onClick={() => setScreen("home")}>BACK HOME</button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (screen === "pvp_result") {
    const opponent = pvpMatch?.opponent;
    const opponentScore = Number((pvpMatch as any)?.opponent?.score || 0);
    const myScore = pvpScore;
    const winner = pvpWinner;
    const isDraw = winner === null || (winner === undefined && myScore === opponentScore);
    const myTelegramId = telegramUser?.id ? String(telegramUser.id) : "";
    const won = !isDraw && String(winner) === myTelegramId;
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <section className="hero-card" style={{ textAlign: "center" }}>
            <div className="hero-badge">🏁 MATCH COMPLETE</div>
            <h1>{isDraw ? "DRAW" : won ? "YOU WIN!" : "YOU LOSE"}</h1>
            <p>{opponent?.first_name || opponent?.username || "Opponent"}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, margin: "24px 0" }}>
              <div className="info-card"><strong>YOU</strong><span style={{ fontSize: 28 }}>{myScore}</span></div>
              <strong style={{ fontSize: 22 }}>VS</strong>
              <div className="info-card"><strong>OPPONENT</strong><span style={{ fontSize: 28 }}>{opponentScore}</span></div>
            </div>
            {!pvpMyFinished && <p style={{ opacity: .7 }}>Суперник уже завершив матч. Заверши свої 10 питань, щоб отримати фінальний результат.</p>}
            <button className="play-button" onClick={() => { void openPvpStats(); }}>
              🏆 PVP STATS
            </button>
            <button className="play-button" style={{ marginTop: 10 }} onClick={() => { setPvpMatch(null); setPvpQuestions([]); setPvpMyFinished(false); setPvpWinner(undefined); setScreen("home"); }}>
              BACK HOME
            </button>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  const refreshInventory = async () => {
      const tg = getTelegramWebApp();
      if (!tg?.initData) return false;
      try {
        const response = await fetch(`${API_BASE}/api/inventory`, {
          headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) return false;
        setInventory(data.items);
        const active = data.items.find((item: InventoryItem) => Number(item.equipped) === 1);
        setEquippedFrame(active ? active.product_id : null);
        return true;
      } catch (error) {
        console.warn("BATTLE IQ: inventory refresh failed", error);
        return false;
      }
    };

  // ==========================================
  // SHOP 2.0
  // ==========================================

  if (screen === "shop") {
    const categories = ["PROFILE", "BATTLE", "PASS"];
    const owned = (id: string) => inventory.find((item) => item.product_id === id);

    const buyProduct = async (product: ShopProduct) => {
      const tg = getTelegramWebApp() as any;
      if (!tg?.initData || typeof tg.openInvoice !== "function") {
        setChallengeNotice("⚠️ Відкрий BATTLE IQ саме через Telegram для оплати.");
        window.setTimeout(() => setChallengeNotice(""), 2600);
        return;
      }

      setShopBusy(product.id);
      tg.HapticFeedback?.impactOccurred("medium");

      try {
        const response = await fetch(`${API_BASE}/api/shop/invoice`, {
          method: "POST",
          headers: {
            Authorization: `tma ${tg.initData}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ productId: product.id }),
        });

        const data = await response.json();
        if (!response.ok || !data?.ok || !data?.url) {
          throw new Error(data?.error || "Не вдалося створити рахунок");
        }

        tg.openInvoice(data.url, (status: string) => {
          if (status === "paid") {
            setChallengeNotice(`✅ ${product.title} оплачено! Оновлюємо інвентар…`);
            tg.HapticFeedback?.notificationOccurred("success");
            void (async () => {
              for (let attempt = 0; attempt < 6; attempt++) {
                await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 500 : 1000));
                const ok = await refreshInventory();
                if (ok) {
                  const tg2 = getTelegramWebApp();
                  const note = tg2 ? `🎉 ${product.title} вже в інвентарі!` : `🎉 ${product.title} додано!`;
                  setChallengeNotice(note);
                  return;
                }
              }
              setChallengeNotice("⏳ Платіж успішний. Telegram ще підтверджує товар — відкрий Shop ще раз за кілька секунд.");
            })();
          } else if (status === "pending") {
            setChallengeNotice("⏳ Платіж обробляється. Товар з'явиться після підтвердження Telegram.");
          } else if (status === "failed") {
            setChallengeNotice("❌ Платіж не пройшов. Спробуй ще раз.");
          } else {
            setChallengeNotice("Покупку скасовано.");
          }
          window.setTimeout(() => setChallengeNotice(""), 3600);
        });
      } catch (error) {
        console.warn("BATTLE IQ: invoice failed", error);
        setChallengeNotice(error instanceof Error ? `⚠️ ${error.message}` : "⚠️ Не вдалося відкрити оплату.");
        window.setTimeout(() => setChallengeNotice(""), 3000);
      } finally {
        setShopBusy(null);
      }
    };

    const equipFrame = async (productId: string) => {
      const tg = getTelegramWebApp();
      if (!tg?.initData) return;
      setShopBusy(productId);
      try {
        const response = await fetch(`${API_BASE}/api/inventory/equip`, {
          method: "POST",
          headers: {
            Authorization: `tma ${tg.initData}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) throw new Error(data?.error || "Не вдалося активувати предмет");
        setInventory((items) => items.map((item) => ({ ...item, equipped: item.product_id === productId ? 1 : 0 })));
        setEquippedFrame(productId);
        setChallengeNotice("✨ Рамку активовано!");
      } catch (error) {
        setChallengeNotice(error instanceof Error ? `⚠️ ${error.message}` : "⚠️ Не вдалося активувати предмет.");
      } finally {
        setShopBusy(null);
        window.setTimeout(() => setChallengeNotice(""), 2400);
      }
    };

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />

        <main className="content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.8, fontWeight: 900, opacity: 0.5 }}>BATTLE IQ STORE</div>
              <h1 style={{ margin: "4px 0 0", fontSize: 30, lineHeight: 1.05 }}>Shop 2.0</h1>
            </div>
            <div style={{ padding: "9px 13px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 900, fontSize: 13 }}>⭐ Stars</div>
          </div>

          <section style={{ position: "relative", overflow: "hidden", padding: 20, borderRadius: 24, background: "linear-gradient(135deg, rgba(124,77,255,0.22), rgba(255,94,168,0.10))", border: "1px solid rgba(157,122,255,0.22)", marginBottom: 18 }}>
            <div style={{ position: "absolute", width: 150, height: 150, right: -55, top: -65, borderRadius: "50%", background: "rgba(124,77,255,0.18)", filter: "blur(8px)" }} />
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, opacity: 0.65 }}>PREMIUM ITEMS</div>
            <div style={{ fontSize: 22, fontWeight: 950, marginTop: 7 }}>Buy exactly what you want.</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.62, maxWidth: 310, marginTop: 6 }}>Оплата проходить через офіційний Telegram Stars. Куплені предмети зберігаються в твоєму інвентарі.</div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 11 }}>
              <h2>🎒 Inventory</h2>
              <span>{inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items{equippedFrame ? ` · ${PROFILE_FRAME_EMOJI[equippedFrame]} active` : ""}</span>
            </div>
            {inventory.length === 0 ? (
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, opacity: 0.55, textAlign: "center" }}>
                {shopLoading ? "Loading inventory…" : "Твій інвентар поки порожній."}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                {inventory.map((item) => (
                  <div key={item.product_id} style={{ minWidth: 125, padding: 11, borderRadius: 16, background: item.equipped ? "rgba(124,77,255,0.15)" : "rgba(255,255,255,0.045)", border: item.equipped ? "1px solid rgba(145,110,255,0.35)" : "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 23 }}>{item.icon || "🎁"}</div>
                    <div style={{ fontSize: 11, fontWeight: 900, marginTop: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 9, opacity: 0.5, marginTop: 3 }}>x{item.quantity}</div>
                    {item.category === "PROFILE" && ["neon_frame", "fire_frame", "legendary_frame"].includes(item.product_id) && (
                      <button type="button" disabled={shopBusy === item.product_id} onClick={() => equipFrame(item.product_id)} style={{ width: "100%", marginTop: 8, border: 0, borderRadius: 9, padding: "7px 5px", background: item.equipped ? "rgba(124,77,255,0.25)" : "rgba(255,255,255,0.08)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: "pointer" }}>
                        {item.equipped ? "EQUIPPED ✓" : "EQUIP"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {categories.map((category) => (
            <section key={category} style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ marginBottom: 11 }}>
                <h2>{category === "PROFILE" ? "👤 Profile" : category === "BATTLE" ? "⚔️ Battle" : "🎟️ Season"}</h2>
                <span>⭐ Stars</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {shopProducts.filter((p) => p.category === category).map((product) => {
                  const item = owned(product.id);
                  const repeatable = product.category === "BATTLE";
                  const showOwned = Boolean(item) && !repeatable;
                  return (
                    <div key={product.id} style={{ position: "relative", padding: 14, minHeight: 178, borderRadius: 20, background: product.featured ? "linear-gradient(145deg, rgba(124,77,255,0.18), rgba(255,255,255,0.045))" : "rgba(255,255,255,0.045)", border: product.featured ? "1px solid rgba(145,110,255,0.28)" : "1px solid rgba(255,255,255,0.07)", boxSizing: "border-box" }}>
                      {product.featured && <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 7px", borderRadius: 8, fontSize: 8, fontWeight: 950, background: "rgba(124,77,255,0.28)", color: "#cfc1ff" }}>FEATURED</div>}
                      <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 15, background: "rgba(255,255,255,0.07)", fontSize: 25, marginBottom: 12 }}>{product.icon || "🎁"}</div>
                      <div style={{ fontWeight: 900, fontSize: 14 }}>{product.title}</div>
                      <div style={{ fontSize: 10.5, lineHeight: 1.35, opacity: 0.55, marginTop: 4, minHeight: 29 }}>{product.description || "Premium BATTLE IQ item"}</div>
                      {showOwned ? (
                        <div style={{ marginTop: 11, padding: "8px 7px", borderRadius: 11, background: "rgba(124,77,255,0.13)", border: "1px solid rgba(124,77,255,0.2)", textAlign: "center", fontSize: 10, fontWeight: 900 }}>OWNED · x{item?.quantity || 0}</div>
                      ) : (
                        <button type="button" disabled={shopBusy === product.id} onClick={() => buyProduct(product)} style={{ width: "100%", marginTop: 11, border: "none", borderRadius: 11, padding: "9px 8px", background: shopBusy === product.id ? "rgba(124,77,255,0.2)" : "rgba(255,255,255,0.09)", color: "inherit", fontWeight: 900, fontSize: 11, cursor: "pointer" }}>
                          {shopBusy === product.id ? "OPENING…" : `BUY · ${product.price_stars} ⭐`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div style={{ padding: "13px 14px", borderRadius: 15, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 10.5, lineHeight: 1.5, opacity: 0.52, textAlign: "center", marginBottom: 12 }}>
            🔐 Покупка перевіряється сервером. Товар додається в D1 тільки після підтвердження успішного платежу Telegram.
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
  // MISSIONS 2.0
  // ==========================================

  if (screen === "missions") {
    const claimMission = async (
      periodType: "daily" | "weekly",
      missionId: string,
      target: number,
      reward: number,
      progress: number,
    ) => {
      if (progress < target || missionsLoading) return;
      const stats = periodType === "daily" ? dailyMissions : weeklyMissions;
      if (stats.claimed.includes(missionId)) return;

      const tg = getTelegramWebApp();
      if (!tg?.initData) return;

      setMissionsLoading(true);
      setMissionNotice("");
      try {
        const response = await fetch(`${API_BASE}/api/missions/claim`, {
          method: "POST",
          headers: {
            Authorization: `tma ${tg.initData}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ periodType, missionId }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not claim mission");

        if (data.profile) {
          setPlayer((current) => ({
            ...current,
            xp: Number(data.profile.xp ?? current.xp),
          }));
        }
        await loadMissions();
        tg.HapticFeedback?.notificationOccurred("success");
        setMissionNotice(`+${Number(data.reward ?? reward)} XP claimed!`);
        window.setTimeout(() => setMissionNotice(""), 2500);
      } catch (error) {
        console.warn("BATTLE IQ: mission claim failed", error);
        setMissionNotice(error instanceof Error ? error.message : "Could not claim mission");
        window.setTimeout(() => setMissionNotice(""), 3000);
      } finally {
        setMissionsLoading(false);
      }
    };

    const renderMission = (
      mission: typeof DAILY_MISSIONS[number],
      stats: DailyMissionStats | WeeklyMissionStats,
      periodType: "daily" | "weekly",
    ) => {
      const progress = Math.min(mission.getProgress(stats as any), mission.target);
      const completed = progress >= mission.target;
      const claimed = stats.claimed.includes(mission.id);
      const percent = (progress / mission.target) * 100;

      return (
        <div key={mission.id} style={{ padding: "16px", borderRadius: "16px", background: completed ? "rgba(124,77,255,0.16)" : "rgba(255,255,255,0.05)", border: completed ? "1px solid rgba(124,77,255,0.35)" : "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", display: "grid", placeItems: "center", background: "rgba(124,77,255,0.14)", fontSize: "22px", flexShrink: 0 }}>{mission.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: "14px" }}>{mission.title}</strong>
              <span style={{ display: "block", marginTop: "3px", fontSize: "12px", opacity: 0.65 }}>{mission.description}</span>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <strong style={{ display: "block", fontSize: "13px" }}>+{mission.reward}</strong>
              <small style={{ opacity: 0.55 }}>XP</small>
            </div>
          </div>
          <div style={{ marginTop: "14px", height: "7px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
            <div style={{ width: `${percent}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #7c4dff, #a855f7)", transition: "width 0.25s ease" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "9px" }}>
            <span style={{ fontSize: "11px", opacity: 0.6 }}>{progress}/{mission.target}</span>
            <button disabled={!completed || claimed || missionsLoading} onClick={() => void claimMission(periodType, mission.id, mission.target, mission.reward, progress)} style={{ border: 0, borderRadius: "10px", padding: "8px 12px", background: claimed ? "rgba(255,255,255,0.08)" : completed ? "#7c4dff" : "rgba(255,255,255,0.06)", color: "inherit", fontSize: "11px", fontWeight: 800, cursor: completed && !claimed ? "pointer" : "default", opacity: !completed || claimed ? 0.55 : 1 }}>
              {claimed ? "✓ CLAIMED" : completed ? "CLAIM XP" : "LOCKED"}
            </button>
          </div>
        </div>
      );
    };

    const dailyCompleted = DAILY_MISSIONS.filter((m) => m.getProgress(dailyMissions) >= m.target).length;
    const weeklyCompleted = WEEKLY_MISSIONS.filter((m) => m.getProgress(weeklyMissions) >= m.target).length;

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="profile-page">
          <section className="profile-hero">
            <div className="profile-big-avatar">🎯</div>
            <h1>MISSIONS</h1>
            <div className="profile-level">{dailyCompleted}/{DAILY_MISSIONS.length} DAILY · {weeklyCompleted}/{WEEKLY_MISSIONS.length} WEEKLY</div>
            <p style={{ marginTop: "8px", opacity: 0.65, fontSize: "13px" }}>Complete missions and claim bonus XP.</p>
          </section>

          {missionNotice && <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 14, background: "rgba(124,77,255,0.16)", border: "1px solid rgba(124,77,255,0.3)", textAlign: "center", fontSize: 12, fontWeight: 800 }}>{missionNotice}</div>}

          <section>
            <div className="section-title"><h2>DAILY</h2><span>{dailyMissions.date || "SYNCING…"}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {DAILY_MISSIONS.map((mission) => renderMission(mission, dailyMissions, "daily"))}
            </div>
          </section>

          <section style={{ marginTop: 22 }}>
            <div className="section-title"><h2>WEEKLY</h2><span>7 DAY GOALS</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {WEEKLY_MISSIONS.map((mission) => renderMission(mission as any, weeklyMissions, "weekly"))}
            </div>
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
              <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", borderRadius: "inherit", ...((equippedFrame && FRAME_STYLES[equippedFrame]) || {}) }}>😎</span>
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
              LEVEL {levelInfo.level} · {levelTitle}
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

          {/* PROGRESSION */}
          <section
            style={{
              marginTop: "12px",
              padding: "14px",
              borderRadius: "16px",
              background: "rgba(124,77,255,0.10)",
              border: "1px solid rgba(124,77,255,0.18)",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div>
                <div style={{ fontSize: "10px", opacity: 0.5, fontWeight: 900, letterSpacing: "0.08em" }}>PROGRESSION</div>
                <strong style={{ display: "block", marginTop: "4px", fontSize: "15px" }}>
                  {levelTitle}
                </strong>
              </div>
              <div style={{ fontSize: "24px" }}>🏅</div>
            </div>

            <div
              style={{
                marginTop: "11px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              <span style={{ opacity: 0.58 }}>NEXT MILESTONE</span>
              <span>{nextMilestone ? `LEVEL ${nextMilestone}` : "MAX"}</span>
            </div>

            <div
              style={{
                marginTop: "7px",
                height: "6px",
                borderRadius: "999px",
                overflow: "hidden",
                background: "rgba(255,255,255,0.07)",
              }}
            >
              <div
                style={{
                  width: `${levelProgress}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #7c4dff, #a855f7)",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "9px",
                fontSize: "10px",
                opacity: 0.6,
              }}
            >
              {nextMilestone
                ? `🎁 ${milestoneReward} · ${nextMilestone - levelInfo.level} levels to go`
                : milestoneReward}
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

    const topPlayers = leaderboard.map((user, index) => [
      user.first_name || user.username || "Player",
      Number(user.xp || 0).toLocaleString(),
      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "",
      "—",
      Number(user.level || 1),
      Number(user.globalRank || index + 1),
      String(user.telegram_id ?? user.id ?? ""),
    ]);

    // If the current player is not in the top 100, append their real D1 row.
    // Never fabricate a player just to fill the leaderboard.
    const meId = String(leaderboardMe?.telegram_id ?? "");
    const alreadyInTop = meId && topPlayers.some((row) => String(row[6]) === meId);

    const worldPlayers = topPlayers.length
      ? (leaderboardMe && meId && !alreadyInTop
          ? [
              ...topPlayers,
              [
                leaderboardMe.first_name || leaderboardMe.username || currentName,
                Number(leaderboardMe.xp || 0).toLocaleString(),
                "",
                "—",
                Number(leaderboardMe.level || 1),
                Number(leaderboardMe.globalRank || globalRank || topPlayers.length + 1),
                meId,
              ],
            ]
          : topPlayers)
      : [
          [
            leaderboardMe?.first_name || leaderboardMe?.username || currentName,
            Number(leaderboardMe?.xp ?? player.xp).toLocaleString(),
            "",
            "—",
            Number(leaderboardMe?.level ?? levelInfo.level),
            Number(leaderboardMe?.globalRank ?? globalRank ?? 1),
            meId || currentName,
          ],
        ];

    // Friends come only from D1. Current player is always included.
    const friendPlayers = [
      [
        currentName,
        player.xp.toLocaleString(),
        "",
        "—",
        levelInfo.level,
        globalRank || 1,
        String(telegramUser?.id ?? ""),
      ],
      ...friends.map((user) => [
        user.first_name || user.username || "Player",
        Number(user.xp || 0).toLocaleString(),
        "",
        "—",
        Number(user.level || 1),
        Number(user.globalRank || 0),
        String(user.telegram_id ?? user.id ?? ""),
      ]),
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

    // Show the podium only when we actually have 3 real players.
    // With 1-2 players, keep the normal leaderboard rows visible.
    const topThree =
      rankingTab === "world" &&
      rankingSearch.trim().length === 0 &&
      worldPlayers.length >= 3
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
            <button
              type="button"
              onClick={async () => {
                const tg = getTelegramWebApp();
                const myId = telegramUser?.id;

                if (!myId) {
                  setChallengeNotice("⚠️ Відкрий BATTLE IQ через Telegram.");
                  window.setTimeout(() => setChallengeNotice(""), 2600);
                  return;
                }

                const inviteUrl =
                  `https://t.me/battleiqbot?startapp=friend_${myId}`;

                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: "BATTLE IQ",
                      text: "⚔️ Приєднуйся до BATTLE IQ! Додамося в друзі та порівняємо результат.",
                      url: inviteUrl,
                    });
                    setChallengeNotice("✅ Invite shared!");
                  } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(inviteUrl);
                    setChallengeNotice("🔗 Invite link copied!");
                  } else {
                    setChallengeNotice(inviteUrl);
                  }
                } catch {
                  setChallengeNotice("⚔️ Invite cancelled.");
                }

                tg?.HapticFeedback?.impactOccurred("medium");
                window.setTimeout(() => setChallengeNotice(""), 3000);
              }}
              style={{
                width: "100%",
                marginBottom: "12px",
                border: "1px solid rgba(168,85,247,0.25)",
                borderRadius: "14px",
                padding: "11px 13px",
                background: "linear-gradient(135deg, rgba(124,77,255,0.16), rgba(168,85,247,0.08))",
                color: "inherit",
                fontSize: "11px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ➕ INVITE A FRIEND
            </button>
          )}

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "7px",
            }}
          >
            {filteredPlayers.map(
              ([name, xp, _medal, movement, level, rank, rowId], index) => {
                const isCurrentPlayer =
                  (meId && String(rowId) === meId) ||
                  (!meId && name === currentName);

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
                {rankingTab === "friends"
                  ? "👥 No friends yet. Invite someone to BATTLE IQ!"
                  : "No players found."}
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
      getLevelInfo(player.xp);

    const leveledUp =
      newLevelInfo.level >
      previousLevelInfo.level;

    const totalQuestions =
      gameQuestions.length;

    const accuracy =
      totalQuestions > 0
        ? Math.round(
            (score / totalQuestions) * 100
          )
        : 0;

    const correctCount =
      questionResults.filter(
        (item) => item === "correct"
      ).length;

    const wrongCount =
      questionResults.filter(
        (item) => item === "wrong"
      ).length;

    const timeoutCount =
      questionResults.filter(
        (item) => item === "timeout"
      ).length;

    const elapsedSeconds =
      Math.max(
        0,
        Math.min(
          60,
          60 - timeLeft
        )
      );

    return (
      <div className="app">
        <main
          className="result-screen"
          style={{
            paddingBottom: "34px",
          }}
        >
          <div className="result-icon">
            {leveledUp ? "🆙" : "🏆"}
          </div>

          <span className="result-label">
            {leveledUp
              ? "LEVEL UP!"
              : "BATTLE COMPLETE"}
          </span>

          <h1>
            {leveledUp
              ? `LEVEL ${newLevelInfo.level}`
              : accuracy >= 80
              ? "Excellent!"
              : accuracy >= 50
              ? "Nice work!"
              : "Keep practicing!"}
          </h1>

          <div className="score-circle">
            <strong>
              {score}/{totalQuestions}
            </strong>
            <span>correct</span>
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              fontWeight: 800,
              opacity: 0.58,
            }}
          >
            {accuracy}% accuracy
          </div>

          <div className="result-stats">
            <div>
              <strong>+{battleXp}</strong>
              <span>XP earned</span>
            </div>

            <div>
              <strong>
                🔥{" "}
                {Math.max(
                  player.bestCombo,
                  battleCombo
                )}
              </strong>
              <span>best combo</span>
            </div>

            <div>
              <strong>{player.streak}</strong>
              <span>day streak</span>
            </div>
          </div>

          {leveledUp && (
            <section
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "14px",
                borderRadius: "16px",
                background: "rgba(124,77,255,0.12)",
                border: "1px solid rgba(124,77,255,0.22)",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "10px", opacity: 0.5, fontWeight: 900, letterSpacing: "0.08em" }}>NEW RANK</div>
              <strong style={{ display: "block", marginTop: "4px", fontSize: "18px" }}>
                LEVEL {newLevelInfo.level} · {getLevelTitle(newLevelInfo.level)}
              </strong>
              <div style={{ marginTop: "6px", fontSize: "11px", opacity: 0.62 }}>
                🎁 Next milestone: {getNextMilestone(newLevelInfo.level) ? `Level ${getNextMilestone(newLevelInfo.level)}` : "All major milestones reached"}
              </div>
            </section>
          )}

          <section
            style={{
              width: "100%",
              marginTop: "12px",
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "9px",
            }}
          >
            {[
              ["⏱️", `${elapsedSeconds}s`, "TIME"],
              ["❤️", `${livesLost}`, "LIVES LOST"],
              ["✅", `${correctCount}`, "CORRECT"],
              ["❌", `${wrongCount}`, "WRONG"],
              ["⌛", `${timeoutCount}`, "TIMEOUT"],
              ["🎯", `${totalQuestions}`, "QUESTIONS"],
            ].map(([icon, value, label]) => (
              <div
                key={label}
                style={{
                  padding: "12px 10px",
                  borderRadius: "14px",
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.06)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "17px" }}>
                  {icon}
                </div>
                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                    fontSize: "15px",
                  }}
                >
                  {value}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: "3px",
                    fontSize: "8px",
                    opacity: 0.48,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </section>

          <section
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "14px",
              boxSizing: "border-box",
              borderRadius: "17px",
              background:
                "linear-gradient(135deg, rgba(124,77,255,0.12), rgba(168,85,247,0.045))",
              border:
                "1px solid rgba(168,85,247,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <strong style={{ fontSize: "13px" }}>
                📊 QUESTION REVIEW
              </strong>
              <span
                style={{
                  fontSize: "9px",
                  opacity: 0.5,
                }}
              >
                {questionResults.length}/{totalQuestions}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {gameQuestions.map((_question, index) => {
                const outcome =
                  questionResults[index];

                const isCorrect =
                  outcome === "correct";
                const isWrong =
                  outcome === "wrong";

                return (
                  <div
                    key={`review-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      padding: "8px 9px",
                      borderRadius: "10px",
                      background:
                        isCorrect
                          ? "rgba(74,222,128,0.07)"
                          : isWrong
                          ? "rgba(248,113,113,0.07)"
                          : "rgba(251,191,36,0.07)",
                      border:
                        "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        display: "grid",
                        placeItems: "center",
                        background:
                          "rgba(255,255,255,0.055)",
                        fontSize: "10px",
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </span>

                    <span
                      style={{
                        flex: 1,
                        fontSize: "10px",
                        fontWeight: 800,
                        opacity: 0.7,
                      }}
                    >
                      {isCorrect
                        ? "Correct answer"
                        : isWrong
                        ? "Wrong answer"
                        : "Time's up"}
                    </span>

                    <span style={{ fontSize: "14px" }}>
                      {isCorrect
                        ? "✅"
                        : isWrong
                        ? "❌"
                        : "⌛"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <button
            className="play-button"
            onClick={startBattle}
            style={{ marginTop: "16px" }}
          >
            ⚔️ PLAY AGAIN
            <span className="arrow">→</span>
          </button>

          <button
            className="secondary-button"
            onClick={() => setScreen("home")}
          >
            ← BACK TO HOME
          </button>
        </main>
      </div>
    );
  }

  // ==========================================
  // BATTLE BOOSTER PICKER
  // ==========================================

  if (boosterPickerOpen) {
    const getBooster = (id: string) =>
      inventory.find((item) => item.product_id === id);

    const boosterCards = [
      {
        id: "second_chance",
        icon: "❤️",
        title: "Second Chance",
        text: "Відновить 1 життя після критичної помилки.",
        selected: selectedSecondChance,
        setSelected: setSelectedSecondChance,
      },
      {
        id: "combo_shield",
        icon: "🛡️",
        title: "Combo Shield",
        text: "Одна помилка не скине твоє комбо.",
        selected: selectedComboShield,
        setSelected: setSelectedComboShield,
      },
      {
        id: "xp_boost",
        icon: "⚡",
        title: "XP Boost",
        text: "+50% XP за цей бій.",
        selected: selectedXpBoost,
        setSelected: setSelectedXpBoost,
      },
    ];

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <section style={{ padding: 20, borderRadius: 24, background: "linear-gradient(135deg, rgba(124,77,255,0.22), rgba(255,94,168,0.10))", border: "1px solid rgba(157,122,255,0.24)", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, opacity: 0.65 }}>BEFORE BATTLE</div>
            <h1 style={{ margin: "6px 0 7px", fontSize: 28 }}>⚡ Boosters</h1>
            <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.62 }}>Обери предмети, які хочеш активувати на цей бій.</div>
          </section>

          <div style={{ display: "grid", gap: 10 }}>
            {boosterCards.map((booster) => {
              const owned = getBooster(booster.id);
              const quantity = Number(owned?.quantity || 0);
              const available = quantity > 0;
              return (
                <button
                  key={booster.id}
                  type="button"
                  disabled={!available}
                  onClick={() => available && booster.setSelected(!booster.selected)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 17,
                    border: booster.selected ? "1px solid rgba(145,110,255,0.65)" : "1px solid rgba(255,255,255,0.07)",
                    background: booster.selected ? "rgba(124,77,255,0.16)" : "rgba(255,255,255,0.045)",
                    color: "inherit",
                    opacity: available ? 1 : 0.45,
                    cursor: available ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.07)", fontSize: 22, flexShrink: 0 }}>{booster.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>{booster.title}</div>
                      <div style={{ marginTop: 4, fontSize: 10, opacity: 0.58, lineHeight: 1.4 }}>{booster.text}</div>
                      <div style={{ marginTop: 5, fontSize: 9, fontWeight: 800, opacity: 0.48 }}>OWNED ×{quantity}</div>
                    </div>
                    <div style={{ width: 25, height: 25, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.18)", background: booster.selected ? "rgba(124,77,255,0.75)" : "transparent", fontSize: 13, fontWeight: 900 }}>{booster.selected ? "✓" : ""}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="play-button"
            onClick={() => void launchBattle()}
            style={{ marginTop: 16 }}
          >
            ⚔️ START BATTLE
            <span className="arrow">→</span>
          </button>

          <button
            className="secondary-button"
            onClick={() => setBoosterPickerOpen(false)}
          >
            ← BACK
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
      <style>{`
        @keyframes biqAnswerCorrect {
          0% { transform: scale(1); }
          35% { transform: scale(1.025); }
          70% { transform: scale(0.995); }
          100% { transform: scale(1); }
        }

        @keyframes biqAnswerWrong {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        @keyframes biqTimerDanger {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.72; }
        }

        @keyframes biqLifeShake {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.08) rotate(-3deg); }
          60% { transform: scale(0.96) rotate(3deg); }
        }

        @keyframes biqComboBurst {
          0% { transform: scale(0.96); opacity: 0.65; }
          55% { transform: scale(1.025); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes biqXpPulse {
          0%, 100% { transform: scale(1); }
          45% { transform: scale(1.06); }
        }

        @keyframes biqProgressGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.45); }
        }
      `}</style>

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

          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div
              style={{
                fontSize: "9px",
                fontWeight: 800,
                opacity: 0.48,
                whiteSpace: "nowrap",
              }}
            >
              ⏱ {timeLeft}s
            </div>
            <div
              className="timer"
              style={{
                color:
                  questionTimeLeft <= 3
                    ? "#ff7187"
                    : undefined,
                animation:
                  questionTimeLeft <= 3
                    ? "biqTimerDanger 0.65s ease-in-out infinite"
                    : undefined,

                background:
                  questionTimeLeft <= 3
                    ? "rgba(255,90,115,0.12)"
                    : undefined,
                minWidth: "42px",
              }}
            >
              {questionTimeLeft}
            </div>
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
              "repeat(4, minmax(0, 1fr))",
            gap: "7px",
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
                battleLives <= 1
                  ? "rgba(255,90,115,0.12)"
                  : "rgba(255,255,255,0.045)",
              animation:
                battleLives <= 1
                  ? "biqLifeShake 0.75s ease-in-out infinite"
                  : undefined,
              border:
                battleLives <= 1
                  ? "1px solid rgba(255,90,115,0.25)"
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
              {"❤️".repeat(battleLives)}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "2px",
                fontSize: "9px",
                opacity: 0.5,
              }}
            >
              LIVES
            </span>
          </div>

          <div
            style={{
              padding: "9px 7px",
              borderRadius: "11px",
              background:
                "rgba(124,77,255,0.10)",
              animation:
                battleXp > 0
                  ? "biqXpPulse 1.8s ease-in-out infinite"
                  : undefined,
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
              animation:
                "biqComboBurst 0.55s ease-out",
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            padding: "7px 10px",
            borderRadius: "10px",
            background: secondChanceAvailable
              ? "rgba(124,77,255,0.09)"
              : "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: "9px",
            fontWeight: 800,
            opacity: 0.75,
          }}
        >
          <span>❤️ SECOND CHANCE</span>
          <span>{secondChanceAvailable ? "READY" : "—"}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            padding: "7px 10px",
            borderRadius: "10px",
            background: comboShieldAvailable ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: "9px",
            fontWeight: 800,
            opacity: 0.75,
          }}
        >
          <span>🛡️ COMBO SHIELD</span>
          <span>{comboShieldAvailable ? "READY" : "—"}</span>
        </div>

        {xpBoostActive && (
          <div
            style={{
              marginBottom: "10px",
              padding: "7px 10px",
              borderRadius: "10px",
              textAlign: "center",
              background: "rgba(250,204,21,0.10)",
              border: "1px solid rgba(250,204,21,0.18)",
              fontSize: "9px",
              fontWeight: 900,
            }}
          >
            ⚡ XP BOOST ACTIVE · +50% XP
          </div>
        )}

        {challengeNotice && (
          <div
            style={{
              marginBottom: "10px",
              padding: "8px 10px",
              borderRadius: "10px",
              textAlign: "center",
              background: "rgba(124,77,255,0.13)",
              border: "1px solid rgba(168,85,247,0.22)",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            {challengeNotice}
          </div>
        )}

        <section
          className="question-card"
          style={{
            animation: "biqProgressGlow 0.55s ease-out",
          }}
        >
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
                  style={{
                    animation:
                      selectedAnswer !== null &&
                      (
                        index === selectedAnswer ||
                        (answer.correct && selectedAnswer !== index)
                      )
                        ? answer.correct
                          ? "biqAnswerCorrect 0.6s ease-out"
                          : "biqAnswerWrong 0.55s ease-out"
                        : undefined,
                  }}
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
            {selectedAnswer === -1
              ? "⏱ Time's up!"
              : selectedAnswer !== null
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