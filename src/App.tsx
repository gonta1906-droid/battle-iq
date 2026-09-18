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
  | "pvp_stats"
  | "season"
  | "referral"
  | "daily_bonus"
  | "social"
  | "collection"
  | "battle_stats";

type Answer = {
  text: string;
  correct: boolean;
};

type Питання = {
  question: string;
  answers: Answer[];
  category?: string;
  difficulty?: string;
};

type ПитанняResult = "correct" | "wrong" | "timeout";

type PvpПитання = {
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


type SeasonReward = {
  level: number;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
};

type SeasonData = {
  id: number;
  seasonNumber: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  maxLevel: number;
  xpPerLevel: number;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  rewards: SeasonReward[];
};

type SeasonPlayer = {
  userId: number;
  firstName?: string | null;
  username?: string | null;
  seasonXp: number;
  seasonLevel: number;
};

type SeasonPassReward = {
  level: number;
  tier: "free" | "premium";
  icon: string;
  title: string;
  description: string;
  code: string;
  unlocked: boolean;
  claimed: boolean;
};

type SeasonPassData = {
  id: number;
  seasonNumber: number;
  title: string;
  startsAt: string;
  endsAt: string;
  xp: number;
  level: number;
  premiumOwned: boolean;
  rewards: SeasonPassReward[];
};

type ServerNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  icon: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
};

type DailyBonusReward = {
  day: number; code: string; title: string; icon: string; type: string;
  amount: number; claimed: boolean; available: boolean;
};

type DailyBonusData = {
  today: string; currentDay: number; claimedToday: boolean;
  claimedDay: number | null; streak: number; bestStreak: number;
  totalClaims: number; rewards: DailyBonusReward[];
};

type ReferralData = {
  code: string;
  link: string;
  referrals: number;
  earnedCoins: number;
  rewardCoins: number;
};

type PlayerData = {
  xp: number;
  coins: number;
  streak: number;
  battles: number;
  totalCorrect: number;
  bestCombo: number;
  bestBattleXp: number;
  profileTitle?: string | null;
  victoryEffect?: string | null;
  profileBackground?: string | null;
  profileAnimation?: string | null;
};

type ShopProduct = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  category: string;
  price_stars: number;
  price_coins?: number;
  enabled?: number;
  featured?: boolean;
};

type ІнвентарItem = {
  product_id: string;
  quantity: number;
  equipped: number;
  title: string;
  description?: string;
  icon?: string;
  category: string;
  price_stars: number;
  price_coins?: number;
};

type LevelReward = {
  id: string;
  level: number;
  icon: string;
  title: string;
  description: string;
  claimed: boolean;
};

const LEVEL_REWARDS: LevelReward[] = [
  { id: "level_5_badge", level: 5, icon: "🎖️", title: "Learner Badge", description: "Badge for reaching Level 5.", claimed: false },
  { id: "level_10_frame", level: 10, icon: "🟣", title: "Special Profile Frame", description: "Profile reward for reaching Level 10.", claimed: false },
  { id: "level_15_effect", level: 15, icon: "⚡", title: "Victory Effect", description: "Special victory effect unlock.", claimed: false },
  { id: "level_20_badge", level: 20, icon: "🔥", title: "Exclusive Badge", description: "Rare badge for reaching Level 20.", claimed: false },
  { id: "level_30_badge", level: 30, icon: "👑", title: "Elite Profile Badge", description: "Elite badge for reaching Level 30.", claimed: false },
  { id: "level_50_badge", level: 50, icon: "💎", title: "Mastermind Badge", description: "Ultimate progression badge.", claimed: false },
];

const SHOP_FALLBACK: ShopProduct[] = [
  { id: "custom_avatar", icon: "🖼️", title: "Custom Avatar", description: "Use your own profile picture", price_stars: 50, category: "PROFILE", featured: true },
  { id: "neon_frame", icon: "🟣", title: "Neon Frame", description: "Stand out in the ranking", price_stars: 25, category: "PROFILE" },
  { id: "fire_frame", icon: "🔥", title: "Fire Frame", description: "Bring the heat to your profile", price_stars: 50, category: "PROFILE" },
  { id: "legendary_frame", icon: "👑", title: "Legendary Frame", description: "Premium profile frame", price_stars: 100, category: "PROFILE" },
  { id: "second_chance", icon: "❤️", title: "Second Chance", description: "One extra life in a battle", price_stars: 15, price_coins: 300, category: "BATTLE" },
  { id: "combo_shield", icon: "🛡️", title: "Combo Shield", description: "Protect your combo from one mistake", price_stars: 30, price_coins: 1000, category: "BATTLE" },
  { id: "xp_boost", icon: "⚡", title: "ДОСВІД Boost", description: "Boost your battle progression", price_stars: 25, price_coins: 2000, category: "BATTLE" },
  { id: "battle_pass", icon: "🎟️", title: "Battle Pass", description: "Unlock exclusive season rewards", price_stars: 299, category: "PASS", featured: true },
  { id: "aurora_frame", icon: "🌈", title: "Aurora Frame", description: "Northern-light inspired profile frame", price_stars: 65, category: "COSMETICS" },
  { id: "cyber_frame", icon: "🧬", title: "Cyber Frame", description: "Neon cyber profile frame", price_stars: 85, category: "COSMETICS" },
  { id: "plasma_frame", icon: "⚡", title: "Plasma Frame", description: "Electric plasma profile frame", price_stars: 95, category: "COSMETICS" },
  { id: "ocean_frame", icon: "🌊", title: "Ocean Frame", description: "Deep-blue ocean profile frame", price_stars: 105, category: "COSMETICS" },
  { id: "emerald_frame", icon: "💚", title: "Emerald Frame", description: "Emerald profile frame", price_stars: 115, category: "COSMETICS" },
  { id: "sunset_frame", icon: "🌅", title: "Sunset Frame", description: "Warm sunset profile frame", price_stars: 125, category: "COSMETICS" },
  { id: "shadow_frame", icon: "🌑", title: "Shadow Frame", description: "Dark shadow profile frame", price_stars: 135, category: "COSMETICS" },
  { id: "solar_frame", icon: "☀️", title: "Solar Frame", description: "Bright solar profile frame", price_stars: 145, category: "COSMETICS" },
  { id: "frostbite_frame", icon: "🧊", title: "Frostbite Frame", description: "Frozen crystal profile frame", price_stars: 165, category: "COSMETICS" },
  { id: "cosmic_frame", icon: "🪐", title: "Cosmic Frame", description: "Deep-space cosmic profile frame", price_stars: 190, category: "COSMETICS" },
  { id: "rookie_title", icon: "🏷️", title: "ROOKIE", description: "Clean starter title for your profile", price_stars: 35, category: "TITLES" },
  { id: "quiz_master_title", icon: "🧠", title: "QUIZ MASTER", description: "For players who live for questions", price_stars: 55, category: "TITLES" },
  { id: "speed_demon_title", icon: "⚡", title: "SPEED DEMON", description: "Fast answers. Faster bragging rights.", price_stars: 65, category: "TITLES" },
  { id: "iq_hunter_title", icon: "🎯", title: "IQ HUNTER", description: "Show that you are chasing every point", price_stars: 80, category: "TITLES" },
  { id: "battle_legend_title", icon: "👑", title: "BATTLE LEGEND", description: "Legendary title for your player card", price_stars: 110, category: "TITLES" },
  { id: "lightning_effect", icon: "⚡", title: "Lightning", description: "Electric victory effect for battle results", price_stars: 65, category: "EFFECTS" },
  { id: "fire_effect", icon: "🔥", title: "Fire", description: "Hot victory effect for battle results", price_stars: 75, category: "EFFECTS" },
  { id: "frost_effect", icon: "❄️", title: "Frost", description: "Frozen victory effect for battle results", price_stars: 85, category: "EFFECTS" },
  { id: "neon_burst_effect", icon: "💥", title: "Neon Burst", description: "Bright neon victory effect", price_stars: 95, category: "EFFECTS" },
  { id: "cosmic_effect", icon: "🌌", title: "Cosmic", description: "Deep-space victory effect", price_stars: 110, category: "EFFECTS" },
  { id: "neon_background", icon: "🟣", title: "Neon", description: "Neon profile background", price_stars: 45, category: "BACKGROUNDS" },
  { id: "galaxy_background", icon: "🌌", title: "Galaxy", description: "Starfield profile background", price_stars: 70, category: "BACKGROUNDS" },
  { id: "matrix_background", icon: "💚", title: "Matrix", description: "Digital green profile background", price_stars: 75, category: "BACKGROUNDS" },
  { id: "aurora_background", icon: "🌈", title: "Aurora", description: "Northern-light profile background", price_stars: 85, category: "BACKGROUNDS" },
  { id: "deep_space_background", icon: "🪐", title: "Deep Space", description: "Deep cosmic profile background", price_stars: 100, category: "BACKGROUNDS" },
  { id: "eclipse_frame", icon: "🌘", title: "Eclipse Frame", description: "Ultra-premium black-and-gold profile frame", price_stars: 225, category: "LEGENDARY" },
  { id: "infinity_frame", icon: "♾️", title: "Infinity Frame", description: "Infinite-energy profile frame", price_stars: 280, category: "LEGENDARY" },
  { id: "royal_frame", icon: "👑", title: "Royal Frame", description: "Royal crown frame for elite profiles", price_stars: 350, category: "LEGENDARY" },
  { id: "grandmaster_title", icon: "🏆", title: "GRANDMASTER", description: "Top-tier title for dedicated BATTLE IQ players", price_stars: 180, category: "LEGENDARY" },
  { id: "nova_effect", icon: "🌟", title: "Nova", description: "Starburst victory effect for battle results", price_stars: 220, category: "LEGENDARY" },
  { id: "singularity_background", icon: "🕳️", title: "Singularity", description: "Deep gravitational profile background", price_stars: 260, category: "LEGENDARY" },
  { id: "pulse_animation", icon: "💓", title: "Pulse", description: "Subtle animated pulse around your profile", price_stars: 90, category: "ANIMATIONS" },
  { id: "orbit_animation", icon: "🪐", title: "Orbit", description: "Animated orbital motion for your profile card", price_stars: 120, category: "ANIMATIONS" },
  { id: "scanline_animation", icon: "📡", title: "Scanline", description: "Animated cyber scanline profile effect", price_stars: 145, category: "ANIMATIONS" },
];

const PROFILE_FRAME_EMOJI: Record<string, string> = {
  neon_frame: "🟣",
  fire_frame: "🔥",
  legendary_frame: "👑",
  ice_frame: "❄️",
  galaxy_frame: "🌌",
  diamond_frame: "💎",
  aurora_frame: "🌈",
  cyber_frame: "🧬",
  plasma_frame: "⚡",
  ocean_frame: "🌊",
  emerald_frame: "💚",
  sunset_frame: "🌅",
  shadow_frame: "🌑",
  solar_frame: "☀️",
  frostbite_frame: "🧊",
  cosmic_frame: "🪐",
  eclipse_frame: "🌘",
  infinity_frame: "♾️",
  royal_frame: "👑",
};

const FRAME_STYLES: Record<string, CSSProperties> = {
  neon_frame: { border: "2px solid rgba(124,77,255,0.95)", boxShadow: "0 0 0 3px rgba(124,77,255,0.16), 0 0 24px rgba(124,77,255,0.42)" },
  fire_frame: { border: "2px solid rgba(255,110,60,0.95)", boxShadow: "0 0 0 3px rgba(255,110,60,0.14), 0 0 24px rgba(255,110,60,0.34)" },
  legendary_frame: { border: "2px solid rgba(255,205,70,0.95)", boxShadow: "0 0 0 3px rgba(255,205,70,0.14), 0 0 28px rgba(255,205,70,0.36)" },
  ice_frame: { border: "2px solid rgba(120,210,255,0.95)", boxShadow: "0 0 0 3px rgba(120,210,255,0.14), 0 0 28px rgba(120,210,255,0.34)" },
  galaxy_frame: { border: "2px solid rgba(180,120,255,0.95)", boxShadow: "0 0 0 3px rgba(180,120,255,0.14), 0 0 32px rgba(180,120,255,0.38)" },
  diamond_frame: { border: "2px solid rgba(180,245,255,0.98)", boxShadow: "0 0 0 3px rgba(180,245,255,0.14), 0 0 30px rgba(180,245,255,0.40)" },
  aurora_frame: { border: "2px solid rgba(110,245,190,0.95)", boxShadow: "0 0 0 3px rgba(110,245,190,0.12), 0 0 30px rgba(110,245,190,0.34)" },
  cyber_frame: { border: "2px solid rgba(80,220,255,0.95)", boxShadow: "0 0 0 3px rgba(80,220,255,0.12), 0 0 30px rgba(80,220,255,0.36)" },
  plasma_frame: { border: "2px solid rgba(190,90,255,0.98)", boxShadow: "0 0 0 3px rgba(190,90,255,0.12), 0 0 30px rgba(190,90,255,0.38)" },
  ocean_frame: { border: "2px solid rgba(60,175,255,0.95)", boxShadow: "0 0 0 3px rgba(60,175,255,0.12), 0 0 30px rgba(60,175,255,0.34)" },
  emerald_frame: { border: "2px solid rgba(80,225,145,0.95)", boxShadow: "0 0 0 3px rgba(80,225,145,0.12), 0 0 30px rgba(80,225,145,0.34)" },
  sunset_frame: { border: "2px solid rgba(255,135,95,0.98)", boxShadow: "0 0 0 3px rgba(255,135,95,0.12), 0 0 30px rgba(255,135,95,0.38)" },
  shadow_frame: { border: "2px solid rgba(170,170,190,0.80)", boxShadow: "0 0 0 3px rgba(0,0,0,0.28), 0 0 30px rgba(40,40,70,0.55)" },
  solar_frame: { border: "2px solid rgba(255,215,90,0.98)", boxShadow: "0 0 0 3px rgba(255,215,90,0.12), 0 0 32px rgba(255,215,90,0.38)" },
  frostbite_frame: { border: "2px solid rgba(175,235,255,0.98)", boxShadow: "0 0 0 3px rgba(175,235,255,0.12), 0 0 32px rgba(175,235,255,0.40)" },
  cosmic_frame: { border: "2px solid rgba(150,110,255,0.98)", boxShadow: "0 0 0 3px rgba(150,110,255,0.12), 0 0 36px rgba(150,110,255,0.42)" },
  eclipse_frame: { border: "2px solid rgba(255,210,120,0.98)", boxShadow: "0 0 0 3px rgba(20,20,35,0.55), 0 0 42px rgba(255,200,95,0.42)" },
  infinity_frame: { border: "2px solid rgba(205,165,255,0.98)", boxShadow: "0 0 0 3px rgba(200,140,255,0.12), 0 0 48px rgba(125,95,255,0.46)" },
  royal_frame: { border: "2px solid rgba(255,225,120,0.99)", boxShadow: "0 0 0 3px rgba(255,205,70,0.16), 0 0 52px rgba(255,215,90,0.50)" },
};

const VICTORY_EFFECT_EMOJI: Record<string, string> = {
  lightning: "⚡",
  fire: "🔥",
  frost: "❄️",
  neon_burst: "💥",
  cosmic: "🌌",
  nova: "🌟",
};

const VICTORY_EFFECT_LABEL: Record<string, string> = {
  lightning: "LIGHTNING",
  fire: "FIRE",
  frost: "FROST",
  neon_burst: "NEON BURST",
  cosmic: "COSMIC",
  nova: "NOVA",
};

const PROFILE_BACKGROUND_STYLES: Record<string, CSSProperties> = {
  neon: {
    background: "linear-gradient(145deg, rgba(124,77,255,0.30), rgba(30,210,255,0.12))",
  },
  galaxy: {
    background: "radial-gradient(circle at 20% 10%, rgba(170,100,255,0.28), transparent 38%), linear-gradient(145deg, rgba(35,25,85,0.95), rgba(8,10,28,0.98))",
  },
  matrix: {
    background: "linear-gradient(145deg, rgba(20,120,75,0.28), rgba(4,26,18,0.98))",
  },
  aurora: {
    background: "radial-gradient(circle at 80% 20%, rgba(60,220,170,0.26), transparent 42%), radial-gradient(circle at 15% 70%, rgba(100,120,255,0.22), transparent 40%), rgba(12,20,32,0.98)",
  },
  deep_space: {
    background: "radial-gradient(circle at 50% 10%, rgba(80,80,190,0.24), transparent 40%), linear-gradient(145deg, rgba(8,10,30,0.98), rgba(3,4,14,1))",
  },
  singularity: {
    background: "radial-gradient(circle at 50% 40%, rgba(255,90,160,0.12), transparent 22%), radial-gradient(circle at 48% 42%, rgba(30,30,35,0.98), rgba(3,3,10,1) 48%, rgba(20,10,35,0.98) 100%)",
  },
};

const COSMETIC_PRODUCT_META: Record<string, { kind: "title" | "effect" | "background" | "animation"; value: string }> = {
  rookie_title: { kind: "title", value: "ROOKIE" },
  quiz_master_title: { kind: "title", value: "QUIZ MASTER" },
  speed_demon_title: { kind: "title", value: "SPEED DEMON" },
  iq_hunter_title: { kind: "title", value: "IQ HUNTER" },
  battle_legend_title: { kind: "title", value: "BATTLE LEGEND" },
  lightning_effect: { kind: "effect", value: "lightning" },
  fire_effect: { kind: "effect", value: "fire" },
  frost_effect: { kind: "effect", value: "frost" },
  neon_burst_effect: { kind: "effect", value: "neon_burst" },
  cosmic_effect: { kind: "effect", value: "cosmic" },
  neon_background: { kind: "background", value: "neon" },
  galaxy_background: { kind: "background", value: "galaxy" },
  matrix_background: { kind: "background", value: "matrix" },
  aurora_background: { kind: "background", value: "aurora" },
  deep_space_background: { kind: "background", value: "deep_space" },
  grandmaster_title: { kind: "title", value: "GRANDMASTER" },
  nova_effect: { kind: "effect", value: "nova" },
  singularity_background: { kind: "background", value: "singularity" },
  pulse_animation: { kind: "animation", value: "pulse" },
  orbit_animation: { kind: "animation", value: "orbit" },
  scanline_animation: { kind: "animation", value: "scanline" },
};

const PROFILE_ANIMATION_LABEL: Record<string, string> = {
  pulse: "PULSE",
  orbit: "ORBIT",
  scanline: "SCANLINE",
};

const PROFILE_ANIMATION_EMOJI: Record<string, string> = {
  pulse: "💓",
  orbit: "🪐",
  scanline: "📡",
};

const PROFILE_ANIMATION_STYLES: Record<string, CSSProperties> = {
  pulse: { animation: "biqProfilePulse 2.1s ease-in-out infinite" },
  orbit: { animation: "biqProfileOrbit 3.4s ease-in-out infinite" },
  scanline: {
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.05) 48%, rgba(120,220,255,0.17) 50%, rgba(255,255,255,0.05) 52%, rgba(255,255,255,0.05) 100%)",
    backgroundSize: "100% 220%",
    animation: "biqProfileScanline 2.2s linear infinite",
  },
};

const PROFILE_ANIMATION_KEYFRAMES = `
@keyframes biqProfilePulse {
  0%,100% { box-shadow: 0 12px 35px rgba(124,77,255,.18), 0 0 0 0 rgba(124,77,255,.00); }
  50% { box-shadow: 0 16px 48px rgba(124,77,255,.28), 0 0 0 7px rgba(124,77,255,.08); }
}
@keyframes biqProfileOrbit {
  0%,100% { box-shadow: 10px -3px 24px rgba(120,210,255,.30), -10px 6px 24px rgba(180,110,255,.18); }
  25% { box-shadow: -6px -9px 24px rgba(120,210,255,.34), -2px 10px 30px rgba(180,110,255,.24); }
  50% { box-shadow: -12px 4px 28px rgba(120,210,255,.22), 10px 4px 30px rgba(180,110,255,.30); }
  75% { box-shadow: 4px 10px 24px rgba(120,210,255,.26), 8px -6px 28px rgba(180,110,255,.30); }
}
@keyframes biqProfileScanline {
  0% { background-position: 0 -100%; }
  100% { background-position: 0 100%; }
}`;

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
        DAILY_МІСІЇ.length
      ),
      target: DAILY_МІСІЇ.length,
      unlocked:
        missions.claimed.length >=
        DAILY_МІСІЇ.length,
    }),
  },
  {
    id: "speed_demon",
    icon: "⚡",
    title: "Speed Demon",
    text: "Earn 300 ДОСВІД in a single battle",
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
    text: "Earn 5,000 total ДОСВІД",
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

type ApiПитання = {
  id: number;
  question: string;
  answers: ApiAnswer[];
  correctIndex?: number;
  category?: string;
  difficulty?: string;
};

function normalizeApiПитанняs(items: ApiПитання[]): Питання[] {
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
          category: item.category,
          difficulty: item.difficulty,
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
          category: item.category,
          difficulty: item.difficulty,
        };
      }

      return null;
    })
    .filter((item) => item !== null) as Питання[];
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
    15: "⚡ ДОСВІД Boost",
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

const DAILY_МІСІЇ = [
  { id: "battle_1", icon: "⚔️", title: "Warm Up", description: "Complete 1 battle today", target: 1, reward: 50, getProgress: (s: DailyMissionStats) => s.battles },
  { id: "correct_15", icon: "🧠", title: "Sharp Mind", description: "Answer 15 questions correctly", target: 15, reward: 75, getProgress: (s: DailyMissionStats) => s.correct },
  { id: "combo_5", icon: "🔥", title: "On Fire", description: "Reach a 5-answer combo", target: 5, reward: 75, getProgress: (s: DailyMissionStats) => s.bestCombo },
  { id: "xp_300", icon: "⚡", title: "ДОСВІД Hunter", description: "Earn 300 ДОСВІД from battles", target: 300, reward: 100, getProgress: (s: DailyMissionStats) => s.xpEarned },
];

const WEEKLY_МІСІЇ = [
  { id: "battle_7", icon: "🏹", title: "Weekly Warrior", description: "Complete 7 battles this week", target: 7, reward: 250, getProgress: (s: WeeklyMissionStats) => s.battles },
  { id: "correct_60", icon: "🧠", title: "Deep Thinker", description: "Answer 60 questions correctly", target: 60, reward: 300, getProgress: (s: WeeklyMissionStats) => s.correct },
  { id: "combo_8", icon: "🔥", title: "Combo Master", description: "Reach an 8-answer combo", target: 8, reward: 300, getProgress: (s: WeeklyMissionStats) => s.bestCombo },
  { id: "xp_1500", icon: "⚡", title: "ДОСВІД Machine", description: "Earn 1,500 ДОСВІД from battles", target: 1500, reward: 400, getProgress: (s: WeeklyMissionStats) => s.xpEarned },
];

function emptyDailyMissionStats(): DailyMissionStats {
  return { date: "", battles: 0, correct: 0, bestCombo: 0, xpEarned: 0, claimed: [] };
}

function emptyWeeklyMissionStats(): WeeklyMissionStats {
  return { periodKey: "", battles: 0, correct: 0, bestCombo: 0, xpEarned: 0, claimed: [] };
}

function App() {
  const [previewProduct, setPreviewProduct] = useState<ShopProduct | null>(null);
  // ==========================================
  // TELEGRAM
  // ==========================================

  const [telegramUser, setTelegramUser] =
    useState<TelegramUser | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralNotice, setReferralNotice] = useState("");
  const [dailyBonus, setDailyBonus] = useState<DailyBonusData | null>(null);
  const [dailyBonusLoading, setDailyBonusLoading] = useState(false);
  const [dailyBonusClaiming, setDailyBonusClaiming] = useState(false);
  const [dailyBonusNotice, setDailyBonusNotice] = useState("");



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

    async function loadПитанняs() {
      setПитанняsLoading(true);
      setПитанняsError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/questions?limit=50`,
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

        const normalized = normalizeApiПитанняs(
          Array.isArray(data.questions)
            ? data.questions
            : []
        );

        if (!normalized.length) {
          throw new Error("База питань порожня");
        }

        if (!cancelled) {
          setПитанняBank(normalized);
        }
      } catch (error) {
        console.error(
          "BATTLE IQ: questions loading failed",
          error
        );

        if (!cancelled) {
          setПитанняsError(
            "Не вдалося завантажити питання. Спробуй ще раз."
          );
        }
      } finally {
        if (!cancelled) {
          setПитанняsLoading(false);
        }
      }
    }

    loadПитанняs();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  const loadServerNotifications = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    setNotificationsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        setServerNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setNotificationUnread(Number(data.unread || 0));
      }
    } catch (error) {
      console.warn("BATTLE IQ: notification load failed", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const bootstrapNotifications = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    try {
      await fetch(`${API_BASE}/api/notifications/bootstrap`, {
        method: "POST",
        headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
      });
    } catch {}
  };

  const openServerNotifications = async () => {
    setNotificationsOpen((value) => !value);
    setSettingsOpen(false);
    await loadServerNotifications();
  };

  const markServerNotificationRead = async (id:number) => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    try {
      await fetch(`${API_BASE}/api/notifications/read`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id }),
      });
      setServerNotifications((prev) => prev.map((n) => n.id === id ? {...n,isRead:true} : n));
      setNotificationUnread((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllServerNotificationsRead = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    try {
      await fetch(`${API_BASE}/api/notifications/read`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ all: true }),
      });
      setServerNotifications((prev) => prev.map((n) => ({...n,isRead:true})));
      setNotificationUnread(0);
    } catch {}
  };

  useEffect(() => {
    void bootstrapNotifications().then(() => loadServerNotifications());
  }, []);

  const loadDailyBonus = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    setDailyBonusLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/daily-bonus`, {
        headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) setDailyBonus(data.dailyBonus || null);
    } catch (error) {
      console.warn("BATTLE IQ: daily bonus load failed", error);
    } finally {
      setDailyBonusLoading(false);
    }
  };

  const claimDailyBonus = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData || !dailyBonus || dailyBonus.claimedToday) return;
    setDailyBonusClaiming(true);
    setDailyBonusNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/daily-bonus/claim`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ day: dailyBonus.currentDay }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setDailyBonusNotice(data?.error || "Не вдалося забрати бонус");
        if (data?.dailyBonus) setDailyBonus(data.dailyBonus);
        return;
      }
      setDailyBonus(data.dailyBonus || null);
      setDailyBonusNotice(`🎉 ${data.reward?.title || "Щоденний бонус отримано!"}`);
      tg.HapticFeedback?.notificationOccurred("success");
      window.setTimeout(() => setDailyBonusNotice(""), 3000);
    } catch (error) {
      console.warn("BATTLE IQ: daily bonus claim failed", error);
      setDailyBonusNotice("Не вдалося забрати бонус. Спробуй ще раз.");
    } finally {
      setDailyBonusClaiming(false);
    }
  };

  useEffect(() => {
    void loadDailyBonus();
  }, []);

  const openSocial = () => {
    setScreen("social");
  };

  const inviteFriendFromSocial = async () => {
    const tg = getTelegramWebApp();
    const myId = telegramUser?.id;
    if (!myId) {
      setChallengeNotice("⚠️ Відкрий BATTLE IQ через Telegram.");
      window.setTimeout(() => setChallengeNotice(""), 2600);
      return;
    }

    const inviteUrl = `https://t.me/batleiqbot?startapp=friend_${myId}`;
    const text = "⚔️ Приєднуйся до BATTLE IQ! Додамося в друзі та порівняємо результат.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "BATTLE IQ", text, url: inviteUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
        setChallengeNotice("🔗 Invite link copied!");
      }
      tg?.HapticFeedback?.impactOccurred("medium");
    } catch {}
  };

  const createFriendChallenge = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) {
      setChallengeNotice("⚠️ Відкрий BATTLE IQ через Telegram.");
      window.setTimeout(() => setChallengeNotice(""), 2600);
      return;
    }
    setChallengeNotice("⚔️ Створюємо виклик...");
    try {
      const response = await fetch(`${API_BASE}/api/pvp/challenge`, {
        method: "POST",
        headers: { Authorization: `tma ${tg.initData}`, "Content-Type": "application/json", Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !data?.match?.matchId) throw new Error(data?.error || "Не вдалося створити виклик");
      const matchId = Number(data.match.matchId);
      const inviteUrl = `https://t.me/batleiqbot?startapp=challenge_${matchId}`;
      const text = "⚔️ Я викликаю тебе на BATTLE IQ 1v1! Відкрий посилання та спробуй перемогти мене.";
      if (navigator.share) {
        await navigator.share({ title: "BATTLE IQ 1v1", text, url: inviteUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
        setChallengeNotice("🔗 Виклик створено — посилання скопійовано!");
      }
      setPvpMatch(data.match);
      setPvpSearching(true);
      setScreen("pvp");
      tg.HapticFeedback?.impactOccurred("medium");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setChallengeNotice(error instanceof Error ? error.message : "Не вдалося створити виклик");
      window.setTimeout(() => setChallengeNotice(""), 3000);
    }
  };

  const joinChallengeFromTelegram = async () => {
    const tg:any = getTelegramWebApp();
    const param = String(tg?.initDataUnsafe?.start_param || "");
    const match = param.match(/^challenge_(\d+)$/);
    if (!tg?.initData || !match) return;
    try {
      const response = await fetch(`${API_BASE}/api/pvp/challenge/join`, {
        method: "POST",
        headers: { Authorization: `tma ${tg.initData}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ matchId: Number(match[1]) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setChallengeNotice(data?.error || "⚠️ Не вдалося приєднатися до виклику");
        window.setTimeout(() => setChallengeNotice(""), 3000);
        return;
      }
      setPvpMatch(data.match);
      setPvpSearching(false);
      setPvpError("");
      setScreen("pvp");
      tg.HapticFeedback?.notificationOccurred("success");
    } catch {
      setChallengeNotice("⚠️ Не вдалося приєднатися до виклику");
      window.setTimeout(() => setChallengeNotice(""), 3000);
    }
  };

  const loadReferral = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    setReferralLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/referral`, {
        headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) setReferral(data.referral || null);
    } catch (error) {
      console.warn("BATTLE IQ: referral load failed", error);
    } finally {
      setReferralLoading(false);
    }
  };

  const activateReferralFromTelegram = async () => {
    const tg:any = getTelegramWebApp();
    const code = String(tg?.initDataUnsafe?.start_param || "");
    if (!tg?.initData || !/^ref_\d+$/.test(code)) return;
    try {
      const response = await fetch(`${API_BASE}/api/referral/activate`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok && data?.activated) {
        setReferralNotice("🎉 Referral activated! +500 coins");
        window.setTimeout(() => setReferralNotice(""), 3000);
        getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
        await loadReferral();
      }
    } catch (error) {
      console.warn("BATTLE IQ: referral activation failed", error);
    }
  };

  const openReferral = async () => {
    setScreen("referral");
    await loadReferral();
  };

  const shareReferral = async () => {
    const tg = getTelegramWebApp();
    if (!referral?.link) return;
    const text = `🧠 BATTLE IQ — грай батли, прокачуй IQ і змагайся з друзями!\n\n🎁 Приєднуйся за моїм запрошенням: ${referral.link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "BATTLE IQ", text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setReferralNotice("✅ Invite copied!");
        window.setTimeout(() => setReferralNotice(""), 2500);
      }
      tg?.HapticFeedback?.impactOccurred("medium");
    } catch {}
  };

  useEffect(() => {
    void activateReferralFromTelegram();
    void joinChallengeFromTelegram();
  }, []);

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

  const [pvpПитанняs, setPvpПитанняs] =
    useState<PvpПитання[]>([]);

  const [pvpПитанняIndex, setPvpПитанняIndex] =
    useState(0);

  const [pvpSelectedAnswer, setPvpSelectedAnswer] =
    useState<number | null>(null);

  const [pvpScore, setPvpScore] =
    useState(0);

  const [pvpПитанняTimeLeft, setPvpПитанняTimeLeft] =
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
  const [battleStats, setBattleStats] = useState<any>(null);
  const [battleHistory, setBattleHistory] = useState<any[]>([]);
  const [battleStatsLoading, setBattleStatsLoading] = useState(false);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);
  const [serverNotifications, setServerNotifications] = useState<ServerNotification[]>([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);


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

  const [serverAchievements, setServerAchievements] = useState<any[]>([]);

  const [battleCombo, setBattleCombo] =
    useState(0);

  const [battleMilestone, setBattleMilestone] =
    useState<{
      icon: string;
      title: string;
      subtitle: string;
    } | null>(null);

  // D1 is the source of truth for player progression.
  // localStorage is intentionally not used for ДОСВІД/level/battles.
  const [player, setPlayer] =
    useState<PlayerData>({
      xp: 0,
      coins: 0,
      streak: 0,
      battles: 0,
      totalCorrect: 0,
      bestCombo: 0,
      bestBattleXp: 0,
      profileTitle: null,
      victoryEffect: null,
      profileBackground: null,
      profileAnimation: null,
    });

  const [shopProducts, setShopProducts] =
    useState<ShopProduct[]>(SHOP_FALLBACK);

  const [inventory, setІнвентар] =
    useState<ІнвентарItem[]>([]);

  const [levelRewards, setLevelRewards] =
    useState<LevelReward[]>(LEVEL_REWARDS);

  const [rewardsLoading, setRewardsLoading] =
    useState(false);

  const [rewardBusy, setRewardBusy] =
    useState<string | null>(null);

  const [rewardNotice, setRewardNotice] =
    useState("");

  const [shopLoading, setShopLoading] =
    useState(false);

  const [shopBusy, setShopBusy] =
    useState<string | null>(null);

  const [equippedFrame, setEquippedFrame] =
    useState<string | null>(null);

  const [gameПитанняs, setGameПитанняs] =
    useState<Питання[]>([]);

  const [questionBank, setПитанняBank] =
    useState<Питання[]>([]);

  const [questionsLoading, setПитанняsLoading] =
    useState(true);

  const [questionsError, setПитанняsError] =
    useState("");

  const [questionIndex, setПитанняIndex] =
    useState(0);

  const [score, setScore] =
    useState(0);

  const [battleXp, setBattleXp] =
    useState(0);

  const [eventBonusXp, setEventBonusXp] =
    useState(0);

  const [selectedAnswer, setSelectedAnswer] =
    useState<number | null>(null);

  const [timeLeft, setTimeLeft] =
    useState(90);

  // Battle 3.0: per-question timer + lives.
  const [questionTimeLeft, setПитанняTimeLeft] =
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

  const [questionResults, setПитанняResults] =
    useState<ПитанняResult[]>([]);

  const [livesLost, setLivesLost] =
    useState(0);

  const [battleFinished, setBattleFinished] =
    useState(false);

  const [previousXp, setPreviousXp] =
    useState(player.xp);

  const [globalRank, setGlobalRank] =
    useState<number | null>(null);

  const [season, setSeason] = useState<SeasonData | null>(null);
  const [seasonPlayers, setSeasonPlayers] = useState<SeasonPlayer[]>([]);
  const [seasonRank, setSeasonRank] = useState<number | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonError, setSeasonError] = useState("");
  const [seasonNow, setSeasonNow] = useState(Date.now());
  const [seasonPass, setSeasonPass] = useState<SeasonPassData | null>(null);
  const [seasonPassClaiming, setSeasonPassClaiming] = useState<string | null>(null);
  const [seasonPassNotice, setSeasonPassNotice] = useState("");

  const currentПитання =
    gameПитанняs[questionIndex];

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

  const loadLevelRewards = async () => {
    const webApp = getTelegramWebApp();
    if (!webApp?.initData) return;
    setRewardsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/rewards`, {
        headers: { Authorization: `tma ${webApp.initData}`, Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) return;
      setLevelRewards(Array.isArray(data.rewards) ? data.rewards : LEVEL_REWARDS);
    } catch (error) {
      console.warn("BATTLE IQ: rewards load failed", error);
    } finally {
      setRewardsLoading(false);
    }
  };

  const claimLevelReward = async (rewardId: string) => {
    const webApp = getTelegramWebApp();
    if (!webApp?.initData) return;
    setRewardBusy(rewardId);
    setRewardNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/rewards/claim`, {
        method: "POST",
        headers: { Authorization: `tma ${webApp.initData}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setRewardNotice(data?.error || "Reward unavailable");
        return;
      }
      setRewardNotice(`🎉 ${data.reward?.title || "Reward unlocked"}`);
      await loadLevelRewards();
      webApp.HapticFeedback?.notificationOccurred?.("success");
    } catch (error) {
      console.warn("BATTLE IQ: reward claim failed", error);
      setRewardNotice("Could not claim reward");
    } finally {
      setRewardBusy(null);
    }
  };

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
          coins: Number(remote.coins ?? current.coins),
          streak: Number(remote.streak ?? current.streak),
          battles: Number(remote.battles ?? current.battles),
          totalCorrect: Number(remote.totalCorrect ?? current.totalCorrect),
          bestCombo: Number(remote.bestCombo ?? current.bestCombo),
          bestBattleXp: Number(remote.bestBattleXp ?? current.bestBattleXp),
          profileTitle: remote.profile_title ?? current.profileTitle ?? null,
          victoryEffect: remote.victory_effect ?? current.victoryEffect ?? null,
          profileBackground: remote.profile_background ?? current.profileBackground ?? null,
          profileAnimation: remote.profile_animation ?? current.profileAnimation ?? null,
        }));

        if (remote.frame) {
          const frameMap: Record<string, string> = {
            neon: "neon_frame",
            fire: "fire_frame",
            legendary: "legendary_frame",
            ice: "ice_frame",
            galaxy: "galaxy_frame",
            diamond: "diamond_frame",
            aurora: "aurora_frame",
            cyber: "cyber_frame",
            plasma: "plasma_frame",
            ocean: "ocean_frame",
            emerald: "emerald_frame",
            sunset: "sunset_frame",
            shadow: "shadow_frame",
            solar: "solar_frame",
            frostbite: "frostbite_frame",
            cosmic: "cosmic_frame",
            season_1_free: "season_s1_free_25",
            season_1_premium: "season_s1_premium_25",
          };
          const frameId = remote.frame ? frameMap[remote.frame] || null : null;
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
    void loadLevelRewards();

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
  // SERVER-AUTHORITATIVE МІСІЇ
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
          setІнвентар(inventoryData.items);
          const active = inventoryData.items.find((item: ІнвентарItem) => Number(item.equipped) === 1);
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
    let cancelled = false;
    const loadAchievements = async () => {
      try {
        const tg = getTelegramWebApp();
        if (!tg?.initData) return;
        const response = await fetch(`${API_BASE}/api/achievements`, {
          headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
        });
        const data = await response.json();
        if (cancelled || !response.ok || !data?.ok) return;
        setServerAchievements(Array.isArray(data.achievements) ? data.achievements : []);
        const firstNew = Array.isArray(data.newlyUnlocked) ? data.newlyUnlocked[0] : null;
        if (firstNew) {
          const achievement = (data.achievements || []).find((item: any) => item.id === firstNew);
          if (achievement) {
            setAchievementToast({ icon: achievement.icon, title: achievement.title });
            getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
            await fetch(`${API_BASE}/api/achievements/seen`, {
              method: "POST",
              headers: {
                Authorization: `tma ${tg.initData}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ achievementId: achievement.id }),
            });
            window.setTimeout(() => setAchievementToast(null), 3500);
          }
        }
      } catch (error) {
        console.warn("BATTLE IQ: achievements sync failed", error);
      }
    };
    loadAchievements();
    return () => { cancelled = true; };
  }, [telegramUser?.id, player.battles, player.bestCombo, player.xp, player.bestBattleXp, dailyMissions.claimed.length, levelInfo.level]);

  const claimAchievementReward = async (achievementId: string) => {
    try {
      const tg = getTelegramWebApp();
      if (!tg?.initData) return;
      const response = await fetch(`${API_BASE}/api/achievements/claim`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ achievementId }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        console.warn("BATTLE IQ: achievement reward claim failed", data?.error);
        return;
      }
      if (data.profile) {
        setPlayer((prev) => ({
          ...prev,
          xp: Number(data.profile.xp ?? prev.xp),
        }));
      }
      setAchievementToast({ icon: "🎁", title: `+${Number(data.reward?.amount || 0)} ДОСВІД Reward` });
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred("success");
      window.setTimeout(() => setAchievementToast(null), 3500);
      // Refresh achievements so the claim button becomes completed.
      const refresh = await fetch(`${API_BASE}/api/achievements`, {
        headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
      });
      const refreshed = await refresh.json();
      if (refresh.ok && refreshed?.ok) setServerAchievements(Array.isArray(refreshed.achievements) ? refreshed.achievements : []);
    } catch (error) {
      console.warn("BATTLE IQ: achievement reward claim failed", error);
    }
  };

  // ==========================================
  // SEASON 1
  // ==========================================

  const loadSeason = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;

    setSeasonLoading(true);
    setSeasonError("");

    try {
      const headers = {
        Authorization: `tma ${tg.initData}`,
        Accept: "application/json",
      };

      const [seasonResponse, leaderboardResponse, passResponse] = await Promise.all([
        fetch(`${API_BASE}/api/season`, { headers }),
        fetch(`${API_BASE}/api/season/leaderboard?limit=50`, { headers }),
        fetch(`${API_BASE}/api/season/pass`, { headers }),
      ]);

      const seasonData = await seasonResponse.json();
      const leaderboardData = await leaderboardResponse.json();
      const passData = await passResponse.json();

      if (!seasonResponse.ok || !seasonData?.ok) {
        throw new Error(seasonData?.error || "Не вдалося завантажити сезон");
      }

      setSeason(seasonData.season || null);

      if (leaderboardResponse.ok && leaderboardData?.ok) {
        setSeasonPlayers(Array.isArray(leaderboardData.players) ? leaderboardData.players : []);
        setSeasonRank(leaderboardData.myRank != null ? Number(leaderboardData.myRank) : null);
      }

      if (passResponse.ok && passData?.ok) {
        setSeasonPass(passData.season || null);
      }
    } catch (error) {
      console.warn("BATTLE IQ: season load failed", error);
      setSeasonError("Не вдалося завантажити Season 1. Спробуй ще раз.");
    } finally {
      setSeasonLoading(false);
    }
  };

  const claimSeasonPassReward = async (rewardCode: string) => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;

    setSeasonPassClaiming(rewardCode);
    setSeasonPassNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/season/pass/claim`, {
        method: "POST",
        headers: {
          Authorization: `tma ${tg.initData}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ rewardCode }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setSeasonPassNotice(data?.error || "Не вдалося забрати нагороду");
        return;
      }
      setSeasonPassNotice(`🎉 ${data.reward?.title || "Нагороду отримано"}`);
      tg.HapticFeedback?.notificationOccurred?.("success");
      await loadSeason();
    } catch (error) {
      console.warn("BATTLE IQ: season pass claim failed", error);
      setSeasonPassNotice("Не вдалося забрати нагороду. Спробуй ще раз.");
    } finally {
      setSeasonPassClaiming(null);
      window.setTimeout(() => setSeasonPassNotice(""), 2800);
    }
  };

  useEffect(() => {
    if (screen !== "season") return;
    void loadSeason();

    const timer = window.setInterval(() => {
      setSeasonNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen]);

  const seasonTimeLeft = useMemo(() => {
    if (!season?.endsAt) return null;
    const diff = Math.max(0, new Date(season.endsAt).getTime() - seasonNow);
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      totalSeconds,
    };
  }, [season?.endsAt, seasonNow]);

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
  // PER-ПИТАННЯ TIMER / ЖИТТЯ
  // ==========================================

  useEffect(() => {
    if (screen !== "battle") return;
    if (battleFinished) return;
    if (!currentПитання) return;
    if (selectedAnswer !== null) return;

    if (questionTimeLeft <= 0) {
      handleПитанняTimeout();
      return;
    }

    const timer = window.setInterval(() => {
      setПитанняTimeLeft((value) => value - 1);
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

  const consumeІнвентарItem = async (productId: string) => {
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

      setІнвентар((items) =>
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
  // BATTLE 4.0 EVENTS
  // ==========================================

  const getПитанняTimeLimit = (index: number) =>
    index >= 3 && index <= 5 ? 10 : index >= 7 ? 20 : 15;

  const isSpeedRound =
    questionIndex >= 3 && questionIndex <= 5;

  const isDoubleXpRound =
    questionIndex >= 7;

  const showBattleMilestone = (
    icon: string,
    title: string,
    subtitle: string
  ) => {
    setBattleMilestone({ icon, title, subtitle });

    window.setTimeout(() => {
      setBattleMilestone((current) =>
        current?.title === title ? null : current
      );
    }, 1500);
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

    const selectedПитанняs =
      shuffle(questionBank).slice(0, 10);

    const preparedПитанняs =
      selectedПитанняs.map(
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
      const consumed = await consumeІнвентарItem("xp_boost");
      if (consumed) {
        setXpBoostActive(true);
        setChallengeNotice("⚡ ДОСВІД BOOST активовано: +50% ДОСВІД");
        window.setTimeout(() => setChallengeNotice(""), 1800);
      }
    }

    setGameПитанняs(
      preparedПитанняs
    );

    setПитанняIndex(0);
    setScore(0);
    setBattleXp(0);
    setEventBonusXp(0);
    setBattleCombo(0);
    setBattleMilestone(null);
    setSelectedAnswer(null);
    setTimeLeft(90);
    setПитанняTimeLeft(getПитанняTimeLimit(0));
    setBattleLives(3);
    setПитанняResults([]);
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
              durationSeconds: Math.max(0, 90 - timeLeft),
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
              coins: Number(data.profile.coins ?? current.coins),
            }));
          }
          if (Number(data.coinReward || 0) > 0) {
            setChallengeNotice(`🪙 +${Number(data.coinReward)} за битву${Number(data.coinReward) === 120 ? " • PERFECT!" : ""}`);
            window.setTimeout(() => setChallengeNotice(""), 2600);
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

  const nextПитання = () => {
    if (
      questionIndex + 1 >=
      gameПитанняs.length
    ) {
      finishBattle();
      return;
    }

    setПитанняIndex(
      (value) => value + 1
    );

    setSelectedAnswer(null);
    setПитанняTimeLeft(getПитанняTimeLimit(questionIndex + 1));
  };

  // ==========================================
  // ПИТАННЯ TIMEOUT
  // ==========================================

  const handleПитанняTimeout = async () => {
    if (!currentПитання) return;
    if (selectedAnswer !== null) return;

    const webApp = getTelegramWebApp();

    webApp?.HapticFeedback?.notificationOccurred("error");
    setSelectedAnswer(-1);
    setBattleCombo(0);
    setПитанняResults((current) => [...current, "timeout"]);
    setLivesLost((current) => current + 1);

    const nextLives = battleLives - 1;

    if (nextLives <= 0) {
      if (secondChanceAvailable) {
        const restored = await consumeІнвентарItem("second_chance");
        if (restored) {
          setSecondChanceAvailable(false);
          setBattleLives(1);
          setChallengeNotice("❤️ ДРУГИЙ ШАНС! +1 life");
          window.setTimeout(() => setChallengeNotice(""), 1500);

          window.setTimeout(() => {
            nextПитання();
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
      nextПитання();
    }, 700);
  };

  // ==========================================
  // ANSWER
  // ==========================================

  const answerПитання = async (
    answerIndex: number
  ) => {
    if (!currentПитання) return;

    if (selectedAnswer !== null)
      return;

    setSelectedAnswer(
      answerIndex
    );

    const answer =
      currentПитання.answers[
        answerIndex
      ];

    const webApp =
      getTelegramWebApp();

    if (answer.correct) {
      webApp?.HapticFeedback?.notificationOccurred(
        "success"
      );

      setПитанняResults((current) => [
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
        Math.floor(questionTimeLeft / 3);

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

      const difficultyMultiplier =
        String(currentПитання.difficulty || "").toLowerCase().includes("hard")
          ? 1.35
          : String(currentПитання.difficulty || "").toLowerCase().includes("medium")
          ? 1.15
          : 1;

      const baseEarnedXp =
        Math.ceil(
          (50 + speedBonus) *
            comboMultiplier *
            difficultyMultiplier
        );

      const eventMultiplier =
        isDoubleXpRound ? 2 : isSpeedRound ? 1.5 : 1;

      const boostedBaseXp =
        Math.ceil(baseEarnedXp * eventMultiplier);

      const earnedXp = xpBoostActive
        ? Math.ceil(boostedBaseXp * 1.5)
        : boostedBaseXp;

      const eventExtra =
        Math.max(0, boostedBaseXp - baseEarnedXp);

      setEventBonusXp((value) => value + eventExtra);

      setBattleXp(
        (value) =>
          value + earnedXp
      );

      if (nextCombo === 3) {
        showBattleMilestone(
          "🔥",
          "КОМБО x3",
          "Multiplier activated"
        );
      } else if (nextCombo === 5) {
        showBattleMilestone(
          "🔥",
          "HOT STREAK x5",
          "Keep the run alive"
        );
      } else if (nextCombo === 8) {
        showBattleMilestone(
          "💥",
          "ON FIRE x8",
          "Maximum combo multiplier"
        );
      } else if (nextCombo === 10) {
        showBattleMilestone(
          "👑",
          "PERFECT КОМБО x10",
          "10 correct answers in a row"
        );
      }

      if (
        String(currentПитання.difficulty || "")
          .toLowerCase()
          .includes("hard")
      ) {
        showBattleMilestone(
          "🔴",
          "HARD CLEAR",
          `+${earnedXp} ДОСВІД`
        );
      }
    } else {
      webApp?.HapticFeedback?.notificationOccurred(
        "error"
      );

      setПитанняResults((current) => [
        ...current,
        "wrong",
      ]);

      // Combo Shield is consumed only when a real mistake happens.
      if (comboShieldAvailable) {
        const protectedCombo = await consumeІнвентарItem("combo_shield");
        if (protectedCombo) {
          setComboShieldAvailable(false);
          setChallengeNotice("🛡️ КОМБО SHIELD! Комбо збережено");
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
          const restored = await consumeІнвентарItem("second_chance");
          if (restored) {
            setSecondChanceAvailable(false);
            setBattleLives(1);
            setChallengeNotice("❤️ ДРУГИЙ ШАНС! +1 life");
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
      nextПитання();
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
              void openServerNotifications();
              getTelegramWebApp()
                ?.HapticFeedback?.selectionChanged();
            }}
            aria-label="Notifications"
          >
            🔔
            {notificationUnread > 0 && (
              <span style={{
                position:"absolute", top:"-4px", right:"-4px",
                minWidth:"16px", height:"16px", padding:"0 4px",
                borderRadius:"99px", display:"grid", placeItems:"center",
                background:"#ff5e9b", color:"#fff", fontSize:"9px", fontWeight:950
              }}>
                {notificationUnread > 9 ? "9+" : notificationUnread}
              </span>
            )}
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
        <div style={{
          position:"fixed",top:"68px",right:"14px",width:"min(330px,calc(100vw - 28px))",
          zIndex:1000,padding:"16px",borderRadius:"16px",
          background:"rgba(18,15,35,.98)",border:"1px solid rgba(255,255,255,.10)",
          boxShadow:"0 18px 50px rgba(0,0,0,.45)",backdropFilter:"blur(16px)"
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <strong>🔔 Notifications</strong>
              {notificationUnread > 0 && <div style={{fontSize:10,opacity:.5,marginTop:3}}>{notificationUnread} unread</div>}
            </div>
            <div style={{display:"flex",gap:6}}>
              {notificationUnread > 0 && (
                <button onClick={() => void markAllServerNotificationsRead()}
                  style={{border:0,borderRadius:9,padding:"6px 8px",background:"rgba(255,255,255,.06)",color:"inherit",fontSize:10,fontWeight:900}}>
                  ✓ ALL
                </button>
              )}
              <button onClick={() => setNotificationsOpen(false)}
                style={{border:0,background:"transparent",color:"inherit",fontSize:18,cursor:"pointer"}}>×</button>
            </div>
          </div>

          {notificationsLoading && serverNotifications.length === 0 ? (
            <div style={{padding:14,borderRadius:12,background:"rgba(255,255,255,.04)",fontSize:12,opacity:.65}}>Loading...</div>
          ) : serverNotifications.length === 0 ? (
            <div style={{padding:16,borderRadius:12,background:"rgba(124,77,255,.10)",fontSize:12,lineHeight:1.45}}>
              🎮 No notifications yet.
              <br /><span style={{opacity:.55}}>New friends, level-ups and rewards will appear here.</span>
            </div>
          ) : (
            <div style={{display:"grid",gap:7,maxHeight:360,overflowY:"auto"}}>
              {serverNotifications.slice(0,8).map((n) => (
                <button key={n.id} onClick={() => void markServerNotificationRead(n.id)}
                  style={{
                    width:"100%",textAlign:"left",border:0,color:"inherit",padding:10,borderRadius:12,
                    background:n.isRead ? "rgba(255,255,255,.035)" : "rgba(124,77,255,.13)",
                    opacity:n.isRead ? .68 : 1
                  }}>
                  <div style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                    <span style={{fontSize:19}}>{n.icon}</span>
                    <span style={{flex:1}}>
                      <strong style={{fontSize:12}}>{n.title}</strong>
                      <div style={{fontSize:11,opacity:.62,lineHeight:1.35,marginTop:2}}>{n.message}</div>
                    </span>
                    {!n.isRead && <span style={{width:6,height:6,borderRadius:"50%",background:"#ff5e9b",marginTop:5}} />}
                  </div>
                </button>
              ))}
            </div>
          )}
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
        <small>Головна</small>
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
        <small>Бій</small>
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
        <small>Магазин</small>
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
        <small>Рейтинг</small>
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
        <small>Профіль</small>
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

  const loadBattleStats = async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return;
    setBattleStatsLoading(true);
    try {
      const headers = { Authorization: `tma ${tg.initData}`, Accept: "application/json" };
      const [statsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/battles/stats`, { headers }),
        fetch(`${API_BASE}/api/battles/history?limit=20`, { headers }),
      ]);
      const [statsData, historyData] = await Promise.all([
        statsRes.json().catch(() => null),
        historyRes.json().catch(() => null),
      ]);
      if (statsRes.ok && statsData?.ok) setBattleStats(statsData.stats);
      if (historyRes.ok && historyData?.ok) setBattleHistory(Array.isArray(historyData.battles) ? historyData.battles : []);
    } catch (error) {
      console.warn("BATTLE IQ: battle stats load failed", error);
    } finally {
      setBattleStatsLoading(false);
    }
  };

  const openBattleStats = async () => {
    setScreen("battle_stats");
    await loadBattleStats();
  };

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
    if (screen !== "pvp_battle" || pvpMyFinished || !pvpПитанняs.length) return;
    const timer = window.setInterval(() => {
      setPvpПитанняTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void submitPvpAnswer(-1);
          return 8;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, pvpПитанняIndex, pvpMyFinished, pvpПитанняs.length]);


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
                  ДОСВІД
                </span>

                <span>
                  {levelInfo.requiredXp.toLocaleString()}{" "}
                  ДОСВІД
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
              🔥 ЩОДЕННИЙ ВИКЛИК
            </div>

            <h1>
              Готовий
              <br />
              перевірити себе?
            </h1>

            <p>
              10 питань. 60
              секунд.
              <br />
              Змагайся з усіма.
            </p>

            <button
              className="play-button"
              onClick={startBattle}
            >
              <span>⚔️</span>

              ГРАТИ

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
                  Питань у банку
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
                <strong>МАГАЗИН</strong>
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
                  МІСІЇ
                </strong>

                <span>
                  {DAILY_МІСІЇ.filter(
                    (mission) =>
                      mission.getProgress(
                        dailyMissions
                      ) >= mission.target
                  ).length}
                  /{DAILY_МІСІЇ.length} complete
                </span>
              </div>

              <b>→</b>
            </button>

            <section
              onClick={openSocial}
              style={{
                marginBottom: 12, padding: 16, cursor: "pointer", borderRadius: 20,
                background: "linear-gradient(135deg, rgba(60,170,255,0.15), rgba(130,100,255,0.11))",
                border: "1px solid rgba(90,180,255,0.18)",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:900, letterSpacing:1, opacity:.55 }}>SOCIAL</div>
                  <div style={{ fontSize:18, fontWeight:950, marginTop:4 }}>👥 Friends Hub</div>
                  <div style={{ fontSize:12, opacity:.55, marginTop:3 }}>{friends.length} friends · compare your stats</div>
                </div>
                <div style={{ fontSize:28 }}>👥</div>
              </div>
            </section>

            <section
              onClick={() => setScreen("daily_bonus")}
              style={{
                marginBottom: 12, padding: 16, cursor: "pointer", borderRadius: 20,
                background: "linear-gradient(135deg, rgba(255,190,70,0.16), rgba(255,90,150,0.10))",
                border: "1px solid rgba(255,190,70,0.18)",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:900, letterSpacing:1, opacity:.55 }}>DAILY BONUS</div>
                  <div style={{ fontSize:18, fontWeight:950, marginTop:4 }}>
                    {dailyBonus?.claimedToday
                      ? "✅ Already claimed"
                      : `Day ${dailyBonus?.currentDay ?? 1} · ${dailyBonus?.rewards?.find((r) => r.day === (dailyBonus?.currentDay ?? 1))?.title ?? "Bonus"}`}
                  </div>
                  <div style={{ fontSize:12, opacity:.55, marginTop:3 }}>7-day reward cycle</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void claimDailyBonus(); }}
                  disabled={dailyBonusLoading || dailyBonusClaiming || !dailyBonus || dailyBonus.claimedToday}
                  style={{ border:0, borderRadius:14, padding:"11px 14px", fontWeight:950,
                    background: dailyBonus?.claimedToday ? "rgba(255,255,255,.08)" : "linear-gradient(135deg,#ffb43d,#ff5e9b)",
                    color:"#fff", whiteSpace:"nowrap" }}
                >
                  {dailyBonusClaiming ? "..." : dailyBonus?.claimedToday ? "ЗАБРАНО" : "ЗАБРАТИ"}
                </button>
              </div>
              {dailyBonusNotice && <div style={{ marginTop:10, fontSize:12, fontWeight:800 }}>{dailyBonusNotice}</div>}
            </section>

            <button
              className="quick-card"
              onClick={() => setScreen("season")}
            >
              <div className="quick-icon" style={{ background: "linear-gradient(135deg, rgba(124,77,255,0.20), rgba(70,160,255,0.14))" }}>
                🏅
              </div>
              <div>
                <strong>SEASON</strong>
                <span>{season ? `Level ${season.level} · ${season.xp} ДОСВІД` : "Season 1 progression"}</span>
              </div>
              <b>→</b>
            </button>

            <button
              className="quick-card"
              onClick={openReferral}
            >
              <div className="quick-icon" style={{ background: "linear-gradient(135deg, rgba(80,220,150,0.20), rgba(40,160,255,0.14))" }}>
                🎁
              </div>
              <div>
                <strong>ЗАПРОСИТИ ДРУЗІВ</strong>
                <span>+500 coins for each referral</span>
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
                <strong>ГРАТИ PvP 1 НА 1</strong>
                <span>Знайди суперника та зіграй онлайн</span>
              </div>
            </div>
            <button className="challenge-button" onClick={startPvpSearch} type="button">
              ЗНАЙТИ СУПЕРНИКА
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
      setPvpПитанняs(data.questions);
      setPvpПитанняIndex(0);
      setPvpSelectedAnswer(null);
      setPvpScore(0);
      setPvpПитанняTimeLeft(8);
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
    const q = pvpПитанняs[pvpПитанняIndex];
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
          questionIndex: pvpПитанняIndex,
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

      if (data.coins !== null && data.coins !== undefined) {
        setPlayer((current) => ({ ...current, coins: Number(data.coins) }));
      }
      if (Number(data.coinReward || 0) > 0) {
        setChallengeNotice(`🪙 +${Number(data.coinReward)} за PvP`);
        window.setTimeout(() => setChallengeNotice(""), 2600);
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
        setPvpПитанняIndex(Number(data.nextПитанняIndex ?? pvpПитанняIndex + 1));
        setPvpSelectedAnswer(null);
        setPvpПитанняTimeLeft(8);
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
                ПОЧАТИ МАТЧ ⚔️
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
    const q = pvpПитанняs[pvpПитанняIndex];
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
            <div style={{ fontSize: 13, opacity: .7, marginBottom: 8 }}>ПИТАННЯ {Math.min(pvpПитанняIndex + 1, 10)} / 10</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 16 }}>{pvpПитанняTimeLeft}s</div>
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
              <strong>ВІДСОТОК ПЕРЕМОГ</strong>
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

          <button className="play-button" onClick={() => setScreen("home")}>НА ГОЛОВНУ</button>
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
            <button className="play-button" style={{ marginTop: 10 }} onClick={() => { setPvpMatch(null); setPvpПитанняs([]); setPvpMyFinished(false); setPvpWinner(undefined); setScreen("home"); }}>
              НА ГОЛОВНУ
            </button>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  const refreshІнвентар = async () => {
      const tg = getTelegramWebApp();
      if (!tg?.initData) return false;
      try {
        const response = await fetch(`${API_BASE}/api/inventory`, {
          headers: { Authorization: `tma ${tg.initData}`, Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) return false;
        setІнвентар(data.items);
        const active = data.items.find((item: ІнвентарItem) => Number(item.equipped) === 1);
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
    const categories = ["PROFILE", "COSMETICS", "TITLES", "EFFECTS", "BACKGROUNDS", "LEGENDARY", "ANIMATIONS", "BATTLE", "PASS"];
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
                const ok = await refreshІнвентар();
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

    const buyProductForCoins = async (product: ShopProduct) => {
      const tg = getTelegramWebApp();
      if (!tg?.initData) {
        setChallengeNotice("⚠️ Відкрий BATTLE IQ через Telegram.");
        window.setTimeout(() => setChallengeNotice(""), 2600);
        return;
      }

      const price = Number(product.price_coins || 0);
      if (price <= 0) {
        setChallengeNotice("Цей предмет продається тільки за ⭐ Stars.");
        window.setTimeout(() => setChallengeNotice(""), 2600);
        return;
      }
      if (player.coins < price) {
        setChallengeNotice(`🪙 Потрібно ${price.toLocaleString()} 🪙. У тебе ${player.coins.toLocaleString()} 🪙.`);
        window.setTimeout(() => setChallengeNotice(""), 2800);
        return;
      }

      setShopBusy(`${product.id}:coins`);
      tg.HapticFeedback?.impactOccurred("medium");

      try {
        const response = await fetch(`${API_BASE}/api/shop/buy-coins`, {
          method: "POST",
          headers: {
            Authorization: `tma ${tg.initData}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ productId: product.id }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Не вдалося купити предмет");
        }

        setPlayer((current) => ({
          ...current,
          coins: Number(data.coins ?? Math.max(0, current.coins - price)),
        }));
        await refreshІнвентар();
        setChallengeNotice(`🎉 ${product.title} куплено за 🪙!`);
        tg.HapticFeedback?.notificationOccurred("success");
      } catch (error) {
        setChallengeNotice(error instanceof Error ? `⚠️ ${error.message}` : "⚠️ Не вдалося купити предмет.");
      } finally {
        setShopBusy(null);
        window.setTimeout(() => setChallengeNotice(""), 2800);
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
        setІнвентар((items) => items.map((item) => ({ ...item, equipped: item.product_id === productId ? 1 : 0 })));
        setEquippedFrame(productId);
        setChallengeNotice("✨ Рамку активовано!");
      } catch (error) {
        setChallengeNotice(error instanceof Error ? `⚠️ ${error.message}` : "⚠️ Не вдалося активувати предмет.");
      } finally {
        setShopBusy(null);
        window.setTimeout(() => setChallengeNotice(""), 2400);
      }
    };


    const equipCosmetic = async (product: ShopProduct) => {
      const tg = getTelegramWebApp();
      if (!tg?.initData) return;

      setShopBusy(product.id);
      try {
        const response = await fetch(`${API_BASE}/api/inventory/equip`, {
          method: "POST",
          headers: {
            Authorization: `tma ${tg.initData}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId: product.id }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Не вдалося активувати предмет");
        }

        setPlayer((current) => {
          const meta = COSMETIC_PRODUCT_META[product.id];
          if (!meta) return current;
          if (meta.kind === "title") return { ...current, profileTitle: meta.value };
          if (meta.kind === "effect") return { ...current, victoryEffect: meta.value };
          if (meta.kind === "background") return { ...current, profileBackground: meta.value };
          return { ...current, profileAnimation: meta.value };
        });

        tg.HapticFeedback?.notificationOccurred("success");
        setChallengeNotice(`✨ ${product.title} активовано!`);
      } catch (error) {
        setChallengeNotice(error instanceof Error ? `⚠️ ${error.message}` : "⚠️ Не вдалося активувати предмет.");
      } finally {
        setShopBusy(null);
        window.setTimeout(() => setChallengeNotice(""), 2400);
      }
    };

    const cosmeticActive = (product: ShopProduct) => {
      const meta = COSMETIC_PRODUCT_META[product.id];
      if (!meta) return false;
      if (meta.kind === "title") return player.profileTitle === meta.value;
      if (meta.kind === "effect") return player.victoryEffect === meta.value;
      if (meta.kind === "background") return player.profileBackground === meta.value;
      return player.profileAnimation === meta.value;
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
              <h1 style={{ margin: "4px 0 0", fontSize: 30, lineHeight: 1.05 }}>Shop 4.2</h1>
            </div>
            <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
              <div style={{ padding: "9px 12px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 900, fontSize: 12 }}>🪙 {player.coins.toLocaleString()}</div>
              <div style={{ padding: "9px 12px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 900, fontSize: 12 }}>⭐ Stars</div>
            </div>
          </div>

          <section style={{ position: "relative", overflow: "hidden", padding: 20, borderRadius: 24, background: "linear-gradient(135deg, rgba(124,77,255,0.22), rgba(255,94,168,0.10))", border: "1px solid rgba(157,122,255,0.22)", marginBottom: 18 }}>
            <div style={{ position: "absolute", width: 150, height: 150, right: -55, top: -65, borderRadius: "50%", background: "rgba(124,77,255,0.18)", filter: "blur(8px)" }} />
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, opacity: 0.65 }}>PREMIUM ITEMS</div>
            <div style={{ fontSize: 22, fontWeight: 950, marginTop: 7 }}>Build your own loadout.</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.62, maxWidth: 310, marginTop: 6 }}>Telegram Stars · прямі покупки · легендарна косметика · анімовані профілі. Обирай предмет, дивись preview та збирай власну колекцію.</div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 11 }}>
              <h2>🎒 Інвентар</h2>
              <span>{inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items{equippedFrame ? ` · ${PROFILE_FRAME_EMOJI[equippedFrame]} active` : ""}</span>
            </div>
            {inventory.length === 0 ? (
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, opacity: 0.55, textAlign: "center" }}>
                {shopLoading ? "Завантаження інвентарю…" : "Твій інвентар поки порожній."}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                {inventory.map((item) => (
                  <div key={item.product_id} style={{ minWidth: 125, padding: 11, borderRadius: 16, background: item.equipped ? "rgba(124,77,255,0.15)" : "rgba(255,255,255,0.045)", border: item.equipped ? "1px solid rgba(145,110,255,0.35)" : "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 23 }}>{item.icon || "🎁"}</div>
                    <div style={{ fontSize: 11, fontWeight: 900, marginTop: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 9, opacity: 0.5, marginTop: 3 }}>x{item.quantity}</div>
                    {(
                      Object.prototype.hasOwnProperty.call(PROFILE_FRAME_EMOJI, item.product_id) ||
                      Object.prototype.hasOwnProperty.call(COSMETIC_PRODUCT_META, item.product_id)
                    ) && (
                      <button
                        type="button"
                        disabled={shopBusy === item.product_id}
                        onClick={() => {
                          if (Object.prototype.hasOwnProperty.call(PROFILE_FRAME_EMOJI, item.product_id)) {
                            void equipFrame(item.product_id);
                          } else {
                            const product: ShopProduct = {
                              id: item.product_id,
                              title: item.title,
                              description: item.description,
                              icon: item.icon,
                              category: item.category,
                              price_stars: item.price_stars,
                              price_coins: (item as any).price_coins,
                            };
                            void equipCosmetic(product);
                          }
                        }}
                        style={{ width: "100%", marginTop: 8, border: 0, borderRadius: 9, padding: "7px 5px", background: (item.equipped || cosmeticActive({ id: item.product_id, title: item.title, description: item.description, icon: item.icon, category: item.category, price_stars: item.price_stars })) ? "rgba(124,77,255,0.25)" : "rgba(255,255,255,0.08)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: "pointer" }}>
                        {(item.equipped || cosmeticActive({ id: item.product_id, title: item.title, description: item.description, icon: item.icon, category: item.category, price_stars: item.price_stars })) ? "EQUIPPED ✓" : "EQUIP"}
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
                <h2>{
                  category === "PROFILE" ? "👤 Profile" :
                  category === "COSMETICS" ? "✨ Frames" :
                  category === "TITLES" ? "🏷️ Titles" :
                  category === "EFFECTS" ? "✨ Victory Effects" :
                  category === "BACKGROUNDS" ? "🎨 Profile Backgrounds" :
                  category === "LEGENDARY" ? "👑 Legendary" :
                  category === "ANIMATIONS" ? "🎞️ Profile Animations" :
                  category === "BATTLE" ? "⚔️ Battle" : "🎟️ Season"
                }</h2>
                <span>{shopProducts.some((p) => p.category === category && Number(p.price_coins || 0) > 0) ? "🪙 Coins · ⭐ Stars" : "⭐ Stars"}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {shopProducts.filter((p) => p.category === category).map((product) => {
                  const item = owned(product.id);
                  const repeatable = product.category === "BATTLE";
                  const showOwned = Boolean(item) && !repeatable;
                  return (
                    <div key={product.id} style={{ position: "relative", padding: 14, minHeight: 178, borderRadius: 20, background: product.featured ? "linear-gradient(145deg, rgba(124,77,255,0.18), rgba(255,255,255,0.045))" : "rgba(255,255,255,0.045)", border: product.featured ? "1px solid rgba(145,110,255,0.28)" : "1px solid rgba(255,255,255,0.07)", boxSizing: "border-box" }}>
                      {product.featured && <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 7px", borderRadius: 8, fontSize: 8, fontWeight: 950, background: "rgba(124,77,255,0.28)", color: "#cfc1ff" }}>FEATURED</div>}
                      {product.category === "LEGENDARY" && <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 7px", borderRadius: 8, fontSize: 8, fontWeight: 950, background: "rgba(255,205,70,0.16)", color: "#ffe89b" }}>LEGENDARY</div>}
                      <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 15, background: "rgba(255,255,255,0.07)", fontSize: 25, marginBottom: 12 }}>{product.icon || "🎁"}</div>
                      <div style={{ fontWeight: 900, fontSize: 14 }}>{product.title}</div>
                      <div style={{ fontSize: 10.5, lineHeight: 1.35, opacity: 0.55, marginTop: 4, minHeight: 29 }}>{product.description || "Premium BATTLE IQ item"}</div>
                      {showOwned ? (
                        <div style={{ marginTop: 11, padding: "8px 7px", borderRadius: 11, background: "rgba(124,77,255,0.13)", border: "1px solid rgba(124,77,255,0.2)", textAlign: "center", fontSize: 10, fontWeight: 900 }}>Є · x{item?.quantity || 0}</div>
                      ) : (
                        <button type="button" disabled={shopBusy === product.id} onClick={() => setPreviewProduct(product)} style={{ width: "100%", marginTop: 11, border: "none", borderRadius: 11, padding: "9px 8px", background: "rgba(255,255,255,0.09)", color: "inherit", fontWeight: 900, fontSize: 11, cursor: "pointer" }}>
                          PREVIEW · {product.price_coins ? `${Number(product.price_coins).toLocaleString()} 🪙 · ${product.price_stars} ⭐` : `${product.price_stars} ⭐`}
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

        {previewProduct && (
          <div
            onClick={() => setPreviewProduct(null)}
            style={{
              position:"fixed", inset:0, zIndex:1100,
              background:"rgba(4,3,10,.72)", backdropFilter:"blur(7px)",
              display:"grid", placeItems:"center", padding:18
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width:"min(360px,100%)", borderRadius:26, padding:20,
                background:"linear-gradient(160deg,rgba(29,24,55,.99),rgba(15,13,28,.99))",
                border:"1px solid rgba(255,255,255,.11)",
                boxShadow:"0 24px 80px rgba(0,0,0,.5)"
              }}
            >
              <style>{PROFILE_ANIMATION_KEYFRAMES}</style>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:10,fontWeight:950,letterSpacing:1.4,opacity:.5}}>ITEM PREVIEW</div>
                <button onClick={() => setPreviewProduct(null)} style={{border:0,background:"transparent",color:"inherit",fontSize:24,cursor:"pointer"}}>×</button>
              </div>

              <div style={{marginTop:18,padding:15,borderRadius:22,background:"rgba(255,255,255,.045)",border:"1px solid rgba(255,255,255,.07)"}}>
                {(() => {
                  const meta = COSMETIC_PRODUCT_META[previewProduct.id];
                  const previewTitle = meta?.kind === "title" ? meta.value : (player.profileTitle || levelTitle);
                  const previewEffect = meta?.kind === "effect" ? meta.value : player.victoryEffect;
                  const previewBackground = meta?.kind === "background" ? meta.value : player.profileBackground;
                  const previewAnimation = meta?.kind === "animation" ? meta.value : player.profileAnimation;
                  const previewFrame = PROFILE_FRAME_EMOJI[previewProduct.id] ? previewProduct.id : (equippedFrame || "");
                  const previewAnimationStyle = PROFILE_ANIMATION_STYLES[previewAnimation || ""] || {};
                  return (
                    <div style={{
                      padding:18,borderRadius:20,textAlign:"center",
                      ...(PROFILE_BACKGROUND_STYLES[previewBackground || ""] || { background:"linear-gradient(145deg,rgba(124,77,255,.16),rgba(255,255,255,.04))" }),
                      ...(FRAME_STYLES[previewFrame] || {}),
                    }}>
                      <div style={{fontSize:10,fontWeight:950,letterSpacing:1.2,opacity:.5}}>ПЕРЕГЛЯД ПРОФІЛЮ</div>
                      <div style={{width:74,height:74,margin:"12px auto 9px",borderRadius:22,display:"grid",placeItems:"center",background:"rgba(255,255,255,.08)",fontSize:34,...(FRAME_STYLES[previewFrame] || {}),...(previewAnimationStyle || {})}}>
                        😎
                      </div>
                      <div style={{fontSize:18,fontWeight:950}}>{telegramUser?.first_name || "BATTLE IQ PLAYER"}</div>
                      <div style={{marginTop:4,fontSize:10,fontWeight:900,opacity:.55}}>{previewTitle}</div>
                      {previewEffect && (
                        <div style={{marginTop:10,padding:"7px 10px",display:"inline-flex",gap:6,alignItems:"center",borderRadius:999,background:"rgba(255,255,255,.08)",fontSize:9,fontWeight:900}}>
                          {VICTORY_EFFECT_EMOJI[previewEffect] || "✨"} {VICTORY_EFFECT_LABEL[previewEffect] || "VICTORY EFFECT"}
                        </div>
                      )}
                      {previewAnimation && (
                        <div style={{marginTop:8,padding:"7px 10px",display:"inline-flex",gap:6,alignItems:"center",borderRadius:999,background:"rgba(255,255,255,.08)",fontSize:9,fontWeight:900}}>
                          {PROFILE_ANIMATION_EMOJI[previewAnimation] || "🎞️"} {PROFILE_ANIMATION_LABEL[previewAnimation] || "ANIMATION"}
                        </div>
                      )}
                      <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:7,padding:"7px 10px",borderRadius:999,background:"rgba(255,255,255,.07)",fontSize:10,fontWeight:900}}>
                        {previewProduct.icon || "✨"} {previewProduct.title}
                      </div>
                    </div>
                  );
                })()}
                <div style={{fontSize:20,fontWeight:950,textAlign:"center",marginTop:13}}>{previewProduct.title}</div>
                <div style={{fontSize:12,opacity:.6,lineHeight:1.5,textAlign:"center",marginTop:5}}>{previewProduct.description}</div>
              </div>

              <button
                type="button"
                disabled={shopBusy === previewProduct.id}
                onClick={() => {
                  const product = previewProduct;
                  setPreviewProduct(null);
                  void buyProduct(product);
                }}
                style={{
                  width:"100%",marginTop:14,border:0,borderRadius:15,padding:"13px",
                  background:"linear-gradient(135deg,#7c4dff,#b96cff)",color:"#fff",
                  fontWeight:950,fontSize:12
                }}
              >
                {shopBusy === previewProduct.id ? "ВІДКРИВАЄМО…" : `КУПИТИ ЗА ${previewProduct.price_stars} ⭐`}
              </button>
              {Number(previewProduct.price_coins || 0) > 0 && (
                <button
                  type="button"
                  disabled={shopBusy === `${previewProduct.id}:coins` || player.coins < Number(previewProduct.price_coins)}
                  onClick={() => {
                    const product = previewProduct;
                    setPreviewProduct(null);
                    void buyProductForCoins(product);
                  }}
                  style={{
                    width:"100%",marginTop:9,border:"1px solid rgba(255,255,255,.10)",borderRadius:15,padding:"13px",
                    background: player.coins >= Number(previewProduct.price_coins) ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)",
                    color:"#fff",fontWeight:950,fontSize:12
                  }}
                >
                  {shopBusy === `${previewProduct.id}:coins` ? "BUYING…" : `КУПИТИ ЗА ${Number(previewProduct.price_coins).toLocaleString()} 🪙`}
                </button>
              )}

              <div style={{marginTop:9,textAlign:"center",fontSize:9,opacity:.38}}>
                Direct purchase · no random rewards
              </div>
            </div>
          </div>
        )}

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
  // COLLECTION 1.0
  // ==========================================

  if (screen === "collection") {
    const ownedIds = new Set(
      inventory.filter((item) => Number(item.quantity || 0) > 0).map((item) => item.product_id)
    );
    const cosmeticProducts = shopProducts.filter((p) => !["BATTLE", "PASS"].includes(p.category));
    const ownedUnique = cosmeticProducts.filter((product) => ownedIds.has(product.id)).length;
    const activeLabel = (product: ShopProduct) => {
      if (PROFILE_FRAME_EMOJI[product.id]) return equippedFrame === product.id;
      const meta = COSMETIC_PRODUCT_META[product.id];
      if (!meta) return false;
      if (meta.kind === "title") return player.profileTitle === meta.value;
      if (meta.kind === "effect") return player.victoryEffect === meta.value;
      if (meta.kind === "background") return player.profileBackground === meta.value;
      return player.profileAnimation === meta.value;
    };
    const categoryLabel = (category: string) =>
      category === "PROFILE" ? "👤 PROFILE" :
      category === "COSMETICS" ? "✨ FRAMES" :
      category === "TITLES" ? "🏷️ TITLES" :
      category === "EFFECTS" ? "💥 EFFECTS" :
      category === "BACKGROUNDS" ? "🎨 BACKGROUNDS" :
      category === "LEGENDARY" ? "👑 LEGENDARY" :
      category === "ANIMATIONS" ? "🎞️ ANIMATIONS" : category;
    const collectionCategories = ["LEGENDARY", "ANIMATIONS", "PROFILE", "COSMETICS", "TITLES", "EFFECTS", "BACKGROUNDS"];
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content" style={{ paddingBottom: 100 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:12, marginBottom:18 }}>
            <div>
              <div style={{ fontSize:11, letterSpacing:1.8, fontWeight:900, opacity:.5 }}>BATTLE IQ COLLECTION</div>
              <h1 style={{ margin:"4px 0 0", fontSize:30, lineHeight:1.05 }}>Your Vault</h1>
            </div>
            <button type="button" onClick={() => setScreen("shop")} style={{ border:0, borderRadius:13, padding:"9px 12px", background:"rgba(255,255,255,.07)", color:"inherit", fontWeight:900, fontSize:10, cursor:"pointer" }}>SHOP</button>
          </div>
          <section style={{ padding:18, borderRadius:22, background:"linear-gradient(145deg,rgba(124,77,255,.18),rgba(255,255,255,.035))", border:"1px solid rgba(255,255,255,.08)", marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <div>
                <div style={{ fontSize:10, opacity:.5, fontWeight:900, letterSpacing:1.2 }}>COLLECTION PROGRESS</div>
                <div style={{ marginTop:5, fontSize:23, fontWeight:950 }}>{ownedUnique}/{cosmeticProducts.length}</div>
                <div style={{ marginTop:2, fontSize:10, opacity:.48 }}>unique cosmetics owned</div>
              </div>
              <div style={{ width:76, height:76, borderRadius:"50%", display:"grid", placeItems:"center", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", fontSize:20, fontWeight:950 }}>{cosmeticProducts.length ? Math.round((ownedUnique / cosmeticProducts.length) * 100) : 0}%</div>
            </div>
            <div style={{ height:8, borderRadius:999, background:"rgba(255,255,255,.07)", overflow:"hidden", marginTop:15 }}>
              <div style={{ width:`${cosmeticProducts.length ? Math.max(3, Math.min(100, Math.round((ownedUnique / cosmeticProducts.length) * 100))) : 0}%`, height:"100%", borderRadius:999, background:"linear-gradient(90deg,#7c4dff,#cf7bff)" }} />
            </div>
          </section>
          {collectionCategories.map((category) => {
            const products = shopProducts.filter((p) => p.category === category);
            if (!products.length) return null;
            return (
              <section key={category} style={{ marginBottom:20 }}>
                <div className="section-title" style={{ marginBottom:10 }}><h2>{categoryLabel(category)}</h2><span>{products.filter((p) => ownedIds.has(p.id)).length}/{products.length}</span></div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:9 }}>
                  {products.map((product) => {
                    const owned = ownedIds.has(product.id);
                    const active = activeLabel(product);
                    return (
                      <div key={product.id} style={{ position:"relative", minHeight:115, padding:12, borderRadius:17, background: active ? "rgba(124,77,255,.15)" : owned ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.025)", border: active ? "1px solid rgba(145,110,255,.35)" : "1px solid rgba(255,255,255,.06)", opacity: owned ? 1 : .55 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}><div style={{ fontSize:22 }}>{product.icon || "🎁"}</div>{active && <span style={{ padding:"4px 6px", borderRadius:8, background:"rgba(124,77,255,.22)", fontSize:7.5, fontWeight:950 }}>АКТИВНО</span>}</div>
                        <div style={{ marginTop:7, fontSize:11, fontWeight:900 }}>{product.title}</div>
                        <div style={{ marginTop:3, fontSize:8.5, opacity:.45 }}>{owned ? `Є · x${inventory.find((item) => item.product_id === product.id)?.quantity || 0}` : "ЗАБЛОКОВАНО · МАГАЗИН"}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <button type="button" onClick={() => setScreen("profile")} style={{ width:"100%", border:0, borderRadius:14, padding:"12px", background:"rgba(255,255,255,.07)", color:"inherit", fontWeight:950, fontSize:11, cursor:"pointer" }}>← НАЗАД ДО ПРОФІЛЮ</button>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // МІСІЇ 2.0
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
        setMissionNotice(`+${Number(data.reward ?? reward)} ДОСВІД claimed!`);
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
      mission: typeof DAILY_МІСІЇ[number],
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
              <small style={{ opacity: 0.55 }}>ДОСВІД</small>
            </div>
          </div>
          <div style={{ marginTop: "14px", height: "7px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
            <div style={{ width: `${percent}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #7c4dff, #a855f7)", transition: "width 0.25s ease" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "9px" }}>
            <span style={{ fontSize: "11px", opacity: 0.6 }}>{progress}/{mission.target}</span>
            <button disabled={!completed || claimed || missionsLoading} onClick={() => void claimMission(periodType, mission.id, mission.target, mission.reward, progress)} style={{ border: 0, borderRadius: "10px", padding: "8px 12px", background: claimed ? "rgba(255,255,255,0.08)" : completed ? "#7c4dff" : "rgba(255,255,255,0.06)", color: "inherit", fontSize: "11px", fontWeight: 800, cursor: completed && !claimed ? "pointer" : "default", opacity: !completed || claimed ? 0.55 : 1 }}>
              {claimed ? "✓ ЗАБРАНО" : completed ? "CLAIM ДОСВІД" : "LOCKED"}
            </button>
          </div>
        </div>
      );
    };

    const dailyCompleted = DAILY_МІСІЇ.filter((m) => m.getProgress(dailyMissions) >= m.target).length;
    const weeklyCompleted = WEEKLY_МІСІЇ.filter((m) => m.getProgress(weeklyMissions) >= m.target).length;

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="profile-page">
          <section className="profile-hero">
            <div className="profile-big-avatar">🎯</div>
            <h1>МІСІЇ</h1>
            <div className="profile-level">{dailyCompleted}/{DAILY_МІСІЇ.length} DAILY · {weeklyCompleted}/{WEEKLY_МІСІЇ.length} WEEKLY</div>
            <p style={{ marginTop: "8px", opacity: 0.65, fontSize: "13px" }}>Complete missions and claim bonus ДОСВІД.</p>
          </section>

          {missionNotice && <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 14, background: "rgba(124,77,255,0.16)", border: "1px solid rgba(124,77,255,0.3)", textAlign: "center", fontSize: 12, fontWeight: 800 }}>{missionNotice}</div>}

          <section>
            <div className="section-title"><h2>DAILY</h2><span>{dailyMissions.date || "SYNCING…"}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {DAILY_МІСІЇ.map((mission) => renderMission(mission, dailyMissions, "daily"))}
            </div>
          </section>

          <section style={{ marginTop: 22 }}>
            <div className="section-title"><h2>WEEKLY</h2><span>7 DAY GOALS</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {WEEKLY_МІСІЇ.map((mission) => renderMission(mission as any, weeklyMissions, "weekly"))}
            </div>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // SEASON
  // ==========================================

  if (screen === "social") {
    const currentStats = {
      name: telegramUser?.first_name || telegramUser?.username || "You",
      xp: Number(player.xp || 0),
      level: Number(levelInfo.level || 1),
      battles: Number(player.battles || 0),
      bestCombo: Number(player.bestCombo || 0),
      bestBattleXp: Number(player.bestBattleXp || 0),
    };

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <div className="section-title" style={{ marginBottom:18 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:900, letterSpacing:1, opacity:.45 }}>SOCIAL</div>
              <h1 style={{ margin:"3px 0 0" }}>Friends Hub</h1>
            </div>
            <button type="button" onClick={inviteFriendFromSocial} style={{ border:0,borderRadius:12,padding:"9px 12px",background:"rgba(255,255,255,.07)",color:"inherit",fontWeight:900 }}>➕</button>
          </div>

          <section style={{
            padding:18,borderRadius:22,marginBottom:14,
            background:"linear-gradient(135deg,rgba(60,170,255,.15),rgba(130,100,255,.12))",
            border:"1px solid rgba(90,180,255,.18)"
          }}>
            <div style={{ fontSize:11,fontWeight:900,letterSpacing:1,opacity:.5 }}>ТВОЯ СТАТИСТИКА</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12 }}>
              <div><strong style={{fontSize:18}}>{currentStats.level}</strong><div style={{fontSize:9,opacity:.45}}>LEVEL</div></div>
              <div><strong style={{fontSize:18}}>{currentStats.xp.toLocaleString()}</strong><div style={{fontSize:9,opacity:.45}}>ДОСВІД</div></div>
              <div><strong style={{fontSize:18}}>{currentStats.bestCombo}</strong><div style={{fontSize:9,opacity:.45}}>КОМБО</div></div>
              <div><strong style={{fontSize:18}}>{currentStats.battles}</strong><div style={{fontSize:9,opacity:.45}}>BATTLES</div></div>
            </div>
          </section>

          {challengeNotice && (
            <div style={{ marginBottom:12,padding:"11px 13px",borderRadius:14,background:"rgba(80,220,150,.12)",fontWeight:800 }}>
              {challengeNotice}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            <button type="button" onClick={createFriendChallenge} style={{ width:"100%",border:0,borderRadius:16,padding:"13px 10px",background:"linear-gradient(135deg,rgba(124,77,255,.28),rgba(60,170,255,.20))",color:"inherit",fontWeight:950 }}>
              ⚔️ CHALLENGE 1V1
            </button>
            <button type="button" onClick={inviteFriendFromSocial} style={{ width:"100%",border:0,borderRadius:16,padding:"13px 10px",background:"rgba(255,255,255,.06)",color:"inherit",fontWeight:950 }}>
              ➕ INVITE FRIEND
            </button>
          </div>

          <div style={{ display:"grid",gap:10 }}>
            {friends.length === 0 ? (
              <section style={{ padding:22,borderRadius:18,background:"rgba(255,255,255,.045)",textAlign:"center" }}>
                <div style={{fontSize:34}}>👥</div>
                <strong>No friends yet</strong>
                <p style={{margin:"7px 0 0",opacity:.55,fontSize:12}}>Invite a friend and compare ДОСВІД, level, battles and combo.</p>
              </section>
            ) : friends.map((friend:any) => {
              const friendXp = Number(friend.xp || 0);
              const friendLevel = Number(friend.level || 1);
              const friendBattles = Number(friend.battles || 0);
              const friendCombo = Number(friend.best_combo || 0);
              const friendBestXp = Number(friend.best_battle_xp || 0);
              const friendCorrect = Number(friend.totalCorrect || 0);
              const activeAt = friend.updated_at ? new Date(friend.updated_at).getTime() : 0;
              const activeRecently = activeAt > 0 && Date.now() - activeAt < 24 * 60 * 60 * 1000;

              return (
                <section key={String(friend.id)} style={{
                  padding:16,borderRadius:20,
                  background:"rgba(255,255,255,.045)",
                  border:"1px solid rgba(255,255,255,.07)"
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:46,height:46,borderRadius:15,display:"grid",placeItems:"center",fontSize:22,background:"rgba(130,100,255,.15)"}}>
                      {friend.avatar || "👤"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <strong style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{friend.first_name || friend.username || "Player"}</strong>
                        {activeRecently && <span style={{fontSize:9,fontWeight:900,color:"#6ee7b7"}}>● АКТИВНО</span>}
                      </div>
                      <div style={{fontSize:11,opacity:.45}}>Global #{Number(friend.globalRank || 0)} · Lv {friendLevel}</div>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginTop:14}}>
                    <div style={{padding:"9px 5px",borderRadius:12,background:"rgba(255,255,255,.04)",textAlign:"center"}}><strong>{friendXp.toLocaleString()}</strong><div style={{fontSize:8,opacity:.4}}>ДОСВІД</div></div>
                    <div style={{padding:"9px 5px",borderRadius:12,background:"rgba(255,255,255,.04)",textAlign:"center"}}><strong>{friendBattles}</strong><div style={{fontSize:8,opacity:.4}}>BATTLES</div></div>
                    <div style={{padding:"9px 5px",borderRadius:12,background:"rgba(255,255,255,.04)",textAlign:"center"}}><strong>{friendCombo}</strong><div style={{fontSize:8,opacity:.4}}>BEST КОМБО</div></div>
                    <div style={{padding:"9px 5px",borderRadius:12,background:"rgba(255,255,255,.04)",textAlign:"center"}}><strong>{friendBestXp}</strong><div style={{fontSize:8,opacity:.4}}>BEST ДОСВІД</div></div>
                  </div>

                  <div style={{marginTop:10,fontSize:11,opacity:.5}}>
                    ✅ {friendCorrect} correct answers
                  </div>
                  <button type="button" onClick={createFriendChallenge} style={{ width:"100%",marginTop:12,border:0,borderRadius:12,padding:"10px 12px",background:"rgba(124,77,255,.16)",color:"inherit",fontWeight:900 }}>
                    ⚔️ CHALLENGE {friend.first_name || friend.username || "FRIEND"}
                  </button>
                </section>
              );
            })}
          </div>

          <button className="quick-card" onClick={() => setScreen("home")} style={{ width:"100%",border:0,marginTop:14 }}>
            <div className="quick-icon purple">⌂</div>
            <div><strong>НА ГОЛОВНУ</strong><span>Повернутися до BATTLE IQ</span></div>
            <b>→</b>
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (screen === "daily_bonus") {
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <div className="section-title" style={{ marginBottom:18 }}>
            <h1 style={{ margin:0 }}>Щоденний бонус</h1>
            <button type="button" onClick={loadDailyBonus} style={{ border:0, borderRadius:12, padding:"9px 12px", background:"rgba(255,255,255,.07)", color:"inherit", fontWeight:800 }}>↻</button>
          </div>
          <section style={{ padding:20, borderRadius:24, background:"linear-gradient(135deg, rgba(255,190,70,.16), rgba(255,90,150,.10))", border:"1px solid rgba(255,190,70,.18)", marginBottom:16 }}>
            <div style={{ fontSize:40 }}>🔥</div>
            <h2 style={{ margin:"8px 0 4px" }}>Щоденна серія</h2>
            <p style={{ margin:0, opacity:.65 }}>Keep the streak alive by claiming one reward every day. Miss a day and the streak resets.</p>
          </section>

          <section className="stats-grid" style={{ marginBottom:16 }}>
            <div className="stat-card"><span>🔥</span><strong>{dailyBonus?.streak ?? 0}</strong><small>CURRENT STREAK</small></div>
            <div className="stat-card"><span>🏆</span><strong>{dailyBonus?.bestStreak ?? 0}</strong><small>BEST STREAK</small></div>
          </section>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:6, marginBottom:18 }}>
            {(dailyBonus?.rewards ?? []).map((reward) => {
              const done = dailyBonus?.claimedToday && reward.day === dailyBonus?.claimedDay;
              const active = reward.day === dailyBonus?.currentDay && !dailyBonus?.claimedToday;
              return (
                <div key={`mini-${reward.day}`} style={{
                  textAlign:"center", padding:"8px 2px", borderRadius:12,
                  background: done ? "rgba(80,220,150,.13)" : active ? "rgba(255,190,70,.14)" : "rgba(255,255,255,.04)",
                  border: active ? "1px solid rgba(255,190,70,.28)" : "1px solid rgba(255,255,255,.05)"
                }}>
                  <div style={{ fontSize:11, opacity:.5 }}>D{reward.day}</div>
                  <div style={{ fontSize:18 }}>{done ? "✓" : reward.icon}</div>
                </div>
              );
            })}
          </div>
          {dailyBonusNotice && <div style={{ marginBottom:14, padding:"12px 14px", borderRadius:14, background:"rgba(80,220,150,.12)", fontWeight:800 }}>{dailyBonusNotice}</div>}
          <section style={{ display:"grid", gap:10 }}>
            {(dailyBonus?.rewards ?? []).map((reward) => {
              const active = reward.day === dailyBonus?.currentDay && !dailyBonus?.claimedToday;
              const claimed = reward.claimed || (dailyBonus?.claimedToday && reward.day === dailyBonus?.claimedDay);
              return (
                <div key={reward.day} style={{
                  display:"flex", alignItems:"center", gap:12, padding:14, borderRadius:18,
                  background:active ? "rgba(255,190,70,.13)" : "rgba(255,255,255,.045)",
                  border:active ? "1px solid rgba(255,190,70,.25)" : "1px solid rgba(255,255,255,.06)"
                }}>
                  <div style={{ width:42,height:42,borderRadius:14,display:"grid",placeItems:"center",background:"rgba(255,255,255,.07)",fontSize:22 }}>{reward.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11,fontWeight:900,opacity:.45 }}>DAY {reward.day}</div>
                    <strong>{reward.title}</strong>
                  </div>
                  {claimed ? <span style={{ fontWeight:900,opacity:.55 }}>ЗАБРАНО</span>
                    : active ? <button type="button" onClick={claimDailyBonus} disabled={dailyBonusClaiming} style={{ border:0,borderRadius:12,padding:"9px 12px",fontWeight:900,background:"linear-gradient(135deg,#ffb43d,#ff5e9b)",color:"#fff" }}>{dailyBonusClaiming ? "..." : "ЗАБРАТИ"}</button>
                    : <span style={{ opacity:.3 }}>🔒</span>}
                </div>
              );
            })}
          </section>
          <button className="quick-card" onClick={() => setScreen("home")} style={{ width:"100%",border:0,marginTop:14 }}>
            <div className="quick-icon purple">⌂</div><div><strong>НА ГОЛОВНУ</strong><span>Повернутися до BATTLE IQ</span></div><b>→</b>
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (screen === "referral") {
    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content">
          <div className="section-title" style={{ marginBottom: 18 }}>
            <h1 style={{ margin: 0 }}>Invite Friends</h1>
            <button type="button" onClick={loadReferral} style={{ border: 0, borderRadius: 12, padding: "9px 12px", background: "rgba(255,255,255,0.07)", color: "inherit", fontWeight: 800 }}>↻</button>
          </div>

          <section style={{ padding: 22, borderRadius: 24, background: "linear-gradient(135deg, rgba(80,220,150,0.18), rgba(70,120,255,0.14))", border: "1px solid rgba(120,220,180,0.20)", marginBottom: 18 }}>
            <div style={{ fontSize: 42 }}>🎁</div>
            <h2 style={{ margin: "8px 0 6px" }}>Bring your squad.</h2>
            <p style={{ margin: 0, opacity: 0.68, lineHeight: 1.5 }}>
              Invite a friend to BATTLE IQ. When they join through your link, both players receive <strong>+500 coins</strong>.
            </p>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><span>👥</span><strong>{referral?.referrals ?? 0}</strong><small>REFERRALS</small></div>
            <div className="stat-card"><span>🪙</span><strong>{(referral?.earnedCoins ?? 0).toLocaleString()}</strong><small>COINS EARNED</small></div>
          </section>

          {referralNotice && (
            <div style={{ margin: "14px 0", padding: "12px 14px", borderRadius: 14, background: "rgba(80,220,150,0.12)", border: "1px solid rgba(80,220,150,0.22)", fontWeight: 800 }}>
              {referralNotice}
            </div>
          )}

          <button className="play-button" onClick={shareReferral} disabled={referralLoading || !referral?.link} style={{ width: "100%", marginBottom: 12 }}>
            🎁 INVITE FRIEND <span className="arrow">→</span>
          </button>

          <button className="quick-card" onClick={() => setScreen("home")} style={{ width: "100%", border: 0 }}>
            <div className="quick-icon purple">⌂</div>
            <div><strong>НА ГОЛОВНУ</strong><span>Повернутися до BATTLE IQ</span></div>
            <b>→</b>
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (screen === "season") {
    const seasonProgress = season
      ? season.level >= season.maxLevel
        ? 100
        : Math.min(100, (season.currentLevelXp / season.xpPerLevel) * 100)
      : 0;

    const formatTime = (value: number) => String(value).padStart(2, "0");

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <Header />

        <main style={{ padding: "12px 14px 100px", overflowX: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 900, letterSpacing: "0.1em" }}>COMPETITIVE PROGRESSION</div>
              <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 950 }}>SEASON 1</h1>
            </div>
            <button type="button" onClick={() => void loadSeason()} disabled={seasonLoading} style={{ border: 0, borderRadius: 11, padding: "9px 11px", background: "rgba(255,255,255,0.07)", color: "inherit", fontSize: 10, fontWeight: 900 }}>
              {seasonLoading ? "…" : "↻ REFRESH"}
            </button>
          </div>

          {seasonError && (
            <div style={{ padding: 12, borderRadius: 13, background: "rgba(255,90,90,0.10)", border: "1px solid rgba(255,90,90,0.18)", fontSize: 11, fontWeight: 800, marginBottom: 12 }}>
              ⚠️ {seasonError}
            </div>
          )}

          {!season && !seasonLoading && !seasonError && (
            <section style={{ padding: 20, borderRadius: 18, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
              <div style={{ fontSize: 42 }}>🏁</div>
              <strong style={{ display: "block", marginTop: 8, fontSize: 16 }}>No active season</strong>
              <span style={{ display: "block", marginTop: 5, fontSize: 11, opacity: 0.55 }}>Сезон 1 зараз не активний.</span>
            </section>
          )}

          {season && (
            <>
              <section style={{ padding: 16, borderRadius: 20, background: "linear-gradient(145deg, rgba(124,77,255,0.20), rgba(50,130,255,0.08))", border: "1px solid rgba(124,77,255,0.24)", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 800 }}>{season.title}</div>
                    <strong style={{ display: "block", marginTop: 4, fontSize: 25 }}>LEVEL {season.level}</strong>
                    <div style={{ marginTop: 4, fontSize: 11, opacity: 0.62 }}>{season.description}</div>
                  </div>
                  <div style={{ width: 54, height: 54, borderRadius: 16, display: "grid", placeItems: "center", fontSize: 29, background: "rgba(255,255,255,0.08)" }}>🏅</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 11, fontWeight: 900 }}>
                  <span>⚡ {season.xp.toLocaleString()} SEASON ДОСВІД</span>
                  <span>{season.level >= season.maxLevel ? "MAX LEVEL" : `${season.currentLevelXp}/${season.xpPerLevel}`}</span>
                </div>
                <div style={{ marginTop: 8, height: 10, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
                  <div style={{ width: `${seasonProgress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #7c4dff, #38bdf8)", transition: "width .3s ease" }} />
                </div>
                <div style={{ marginTop: 6, textAlign: "right", fontSize: 9, opacity: 0.5 }}>{Math.round(seasonProgress)}% to next level</div>
              </section>

              <section style={{ marginTop: 12, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 900 }}>SEASON ENDS IN</div>
                    <strong style={{ display: "block", marginTop: 4, fontSize: 19 }}>
                      {seasonTimeLeft && seasonTimeLeft.totalSeconds > 0
                        ? `${seasonTimeLeft.days}d ${formatTime(seasonTimeLeft.hours)}:${formatTime(seasonTimeLeft.minutes)}:${formatTime(seasonTimeLeft.seconds)}`
                        : "ENDED"}
                    </strong>
                  </div>
                  <div style={{ fontSize: 28 }}>⏳</div>
                </div>
              </section>

              <section style={{ marginTop: 12, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 900 }}>YOUR SEASON RANK</div>
                    <strong style={{ display: "block", marginTop: 3, fontSize: 24 }}>{seasonRank != null ? `#${seasonRank}` : "—"}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 900 }}>REWARD LEVELS</div>
                    <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800 }}>5 → 50</div>
                  </div>
                </div>
              </section>

              <section style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 900 }}>SEASON REWARDS</div>
                    <strong style={{ display: "block", marginTop: 3, fontSize: 15 }}>Climb to unlock rewards</strong>
                  </div>
                  <span style={{ fontSize: 20 }}>🎁</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {season.rewards.map((reward) => (
                    <div key={reward.level} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 13, background: reward.unlocked ? "rgba(124,77,255,0.11)" : "rgba(255,255,255,0.03)", border: reward.unlocked ? "1px solid rgba(124,77,255,0.22)" : "1px solid rgba(255,255,255,0.05)", opacity: reward.unlocked ? 1 : 0.58 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(124,77,255,0.12)", fontSize: 20 }}>{reward.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 900 }}>{reward.title}</div>
                        <div style={{ marginTop: 2, fontSize: 9, opacity: 0.52 }}>LEVEL {reward.level} · {reward.description}</div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>{reward.unlocked ? "✓ UNLOCKED" : "🔒"}</div>
                    </div>
                  ))}
                </div>
              </section>

              {seasonPass && (
                <section style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                    <div>
                      <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 900 }}>SEASON PASS</div>
                      <strong style={{ display: "block", marginTop: 3, fontSize: 15 }}>Free + Premium rewards</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.55 }}>299 ⭐</div>
                      <div style={{ fontSize: 8, opacity: 0.4 }}>BATTLE PASS</div>
                    </div>
                  </div>

                  <div style={{ padding: 13, borderRadius: 16, background: seasonPass.premiumOwned ? "rgba(255,205,70,0.09)" : "rgba(124,77,255,0.08)", border: seasonPass.premiumOwned ? "1px solid rgba(255,205,70,0.20)" : "1px solid rgba(124,77,255,0.16)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{seasonPass.premiumOwned ? "✨ PREMIUM АКТИВНО" : "🎟️ PREMIUM LOCKED"}</strong>
                        <div style={{ marginTop: 3, fontSize: 9, opacity: 0.55 }}>
                          {seasonPass.premiumOwned ? "Premium rewards are available when you reach their levels." : "Unlock the premium track with the Battle Pass."}
                        </div>
                      </div>
                      {!seasonPass.premiumOwned && (
                        <button type="button" onClick={() => setScreen("shop")} style={{ border: 0, borderRadius: 10, padding: "9px 10px", background: "#7c4dff", color: "white", fontSize: 9, fontWeight: 950, whiteSpace: "nowrap" }}>GET PASS</button>
                      )}
                    </div>
                  </div>

                  {seasonPassNotice && (
                    <div style={{ marginTop: 8, padding: 10, borderRadius: 11, background: "rgba(50,220,150,0.09)", border: "1px solid rgba(50,220,150,0.16)", fontSize: 10, fontWeight: 800 }}>
                      {seasonPassNotice}
                    </div>
                  )}

                  <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 7 }}>
                    {seasonPass.rewards.map((reward) => {
                      const canClaim = reward.unlocked && !reward.claimed && (reward.tier === "free" || seasonPass.premiumOwned);
                      const lockedPremium = reward.tier === "premium" && !seasonPass.premiumOwned;
                      return (
                        <div key={reward.code} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 13, background: reward.unlocked ? (reward.tier === "premium" ? "rgba(255,205,70,0.08)" : "rgba(124,77,255,0.09)") : "rgba(255,255,255,0.025)", border: reward.unlocked ? (reward.tier === "premium" ? "1px solid rgba(255,205,70,0.16)" : "1px solid rgba(124,77,255,0.16)") : "1px solid rgba(255,255,255,0.05)", opacity: reward.unlocked ? 1 : 0.56 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: reward.tier === "premium" ? "rgba(255,205,70,0.10)" : "rgba(124,77,255,0.10)", fontSize: 19 }}>{reward.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 950 }}>LVL {reward.level}</span>
                              <span style={{ fontSize: 8, fontWeight: 900, opacity: 0.55 }}>{reward.tier === "premium" ? "PREMIUM" : "FREE"}</span>
                            </div>
                            <div style={{ marginTop: 2, fontSize: 11, fontWeight: 850 }}>{reward.title}</div>
                            <div style={{ marginTop: 2, fontSize: 8, opacity: 0.48 }}>{reward.description}</div>
                          </div>
                          <button type="button" disabled={!canClaim || seasonPassClaiming === reward.code} onClick={() => void claimSeasonPassReward(reward.code)} style={{ border: 0, borderRadius: 9, padding: "7px 9px", background: reward.claimed ? "rgba(255,255,255,0.06)" : canClaim ? (reward.tier === "premium" ? "#b98900" : "#7c4dff") : "rgba(255,255,255,0.04)", color: "inherit", fontSize: 8, fontWeight: 950, whiteSpace: "nowrap", opacity: reward.claimed ? 0.55 : 1 }}>
                            {reward.claimed ? "✓ ЗАБРАНО" : lockedPremium ? "🎟️" : reward.unlocked ? (seasonPassClaiming === reward.code ? "…" : "ЗАБРАТИ") : "🔒"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 900 }}>SEASON LEADERBOARD</div>
                    <strong style={{ display: "block", marginTop: 3, fontSize: 15 }}>Top players this season</strong>
                  </div>
                  <span style={{ fontSize: 20 }}>🏆</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {seasonPlayers.length ? seasonPlayers.map((entry, index) => (
                    <div key={entry.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 13, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ width: 25, textAlign: "center", fontSize: 13, fontWeight: 950 }}>{index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.firstName || entry.username || "BATTLE IQ PLAYER"}</div>
                        <div style={{ marginTop: 2, fontSize: 9, opacity: 0.45 }}>LEVEL {entry.seasonLevel}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ display: "block", fontSize: 12 }}>{entry.seasonXp.toLocaleString()}</strong>
                        <span style={{ fontSize: 8, opacity: 0.45 }}>SEASON ДОСВІД</span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: 16, borderRadius: 13, background: "rgba(255,255,255,0.035)", textAlign: "center", fontSize: 11, opacity: 0.55 }}>Ще ніхто не набрав Season ДОСВІД. Починай першим ⚡</div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>

        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // PROFILE
  // ==========================================

  if (screen === "battle_stats") {
    const stats = battleStats || {
      played: 0, totalCorrect: 0, accuracy: 0, totalXp: 0,
      averageXp: 0, bestXp: 0, bestScore: 0, averageScore: 0,
      averageDuration: 0, streak: 0, bestCombo: 0, bestBattleXp: 0,
      last7Days: { battles: 0, xp: 0, correct: 0 },
      today: { battles: 0, xp: 0, correct: 0 },
    };
    const formatDuration = (seconds: number) => {
      const total = Math.max(0, Math.round(Number(seconds || 0)));
      const minutes = Math.floor(total / 60);
      const secs = total % 60;
      return `${minutes}:${String(secs).padStart(2, "0")}`;
    };
    const formatDate = (value: string | null | undefined) => {
      if (!value) return "—";
      const date = new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    };

    return (
      <div className="app">
        <div className="glow glow-one" />
        <div className="glow glow-two" />
        <Header />
        <main className="content" style={{ paddingBottom: 100 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:12, marginBottom:18 }}>
            <div>
              <div style={{ fontSize:11, letterSpacing:1.8, fontWeight:900, opacity:.5 }}>BATTLE IQ ANALYTICS</div>
              <h1 style={{ margin:"4px 0 0", fontSize:30, lineHeight:1.05 }}>Статистика боїв</h1>
            </div>
            <button type="button" onClick={() => void loadBattleStats()} disabled={battleStatsLoading} style={{ border:0,borderRadius:12,padding:"9px 12px",background:"rgba(255,255,255,.07)",color:"inherit",fontWeight:900,fontSize:10 }}>{battleStatsLoading ? "…" : "↻ ОНОВИТИ"}</button>
          </div>

          <section style={{ padding:18,borderRadius:22,background:"linear-gradient(145deg,rgba(124,77,255,.18),rgba(255,255,255,.035))",border:"1px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize:10,letterSpacing:1.2,fontWeight:900,opacity:.5 }}>CAREER</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:12 }}>
              {[
                ["⚔️", stats.played, "BATTLES"],
                ["🎯", `${stats.accuracy}%`, "ACCURACY"],
                ["⚡", Number(stats.totalXp || 0).toLocaleString(), "TOTAL ДОСВІД"],
                ["🏆", `${stats.bestScore}%`, "BEST SCORE"],
                ["🔥", stats.bestCombo, "BEST КОМБО"],
                ["💎", stats.bestXp, "BEST BATTLE ДОСВІД"],
              ].map(([icon,value,label]) => (
                <div key={String(label)} style={{ padding:"11px 7px",borderRadius:13,background:"rgba(255,255,255,.045)",textAlign:"center",border:"1px solid rgba(255,255,255,.055)" }}>
                  <div style={{ fontSize:16 }}>{icon}</div>
                  <strong style={{ display:"block",marginTop:4,fontSize:16 }}>{value}</strong>
                  <div style={{ marginTop:3,fontSize:8,opacity:.45,fontWeight:900 }}>{label}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginTop:12,padding:15,borderRadius:18,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10,fontWeight:900,letterSpacing:1,opacity:.5 }}>RECENT ACTIVITY</div>
                <strong style={{ display:"block",marginTop:4,fontSize:15 }}>Last 7 days</strong>
              </div>
              <span style={{ fontSize:20 }}>📈</span>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:11 }}>
              <div style={{ padding:"10px 7px",borderRadius:12,background:"rgba(255,255,255,.035)",textAlign:"center" }}><strong>{stats.last7Days.battles}</strong><div style={{fontSize:8,opacity:.45}}>BATTLES</div></div>
              <div style={{ padding:"10px 7px",borderRadius:12,background:"rgba(255,255,255,.035)",textAlign:"center" }}><strong>{Number(stats.last7Days.xp || 0).toLocaleString()}</strong><div style={{fontSize:8,opacity:.45}}>ДОСВІД</div></div>
              <div style={{ padding:"10px 7px",borderRadius:12,background:"rgba(255,255,255,.035)",textAlign:"center" }}><strong>{stats.last7Days.correct}</strong><div style={{fontSize:8,opacity:.45}}>ПРАВИЛЬНО</div></div>
            </div>
            <div style={{ marginTop:10,fontSize:10,opacity:.52 }}>Today: {stats.today.battles} battles · +{Number(stats.today.xp || 0)} ДОСВІД · {stats.today.correct} correct</div>
          </section>

          <section style={{ marginTop:12,padding:15,borderRadius:18,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10,fontWeight:900,letterSpacing:1,opacity:.5 }}>AVERAGES</div>
                <strong style={{ display:"block",marginTop:4,fontSize:15 }}>How you usually play</strong>
              </div>
              <div style={{ fontSize:20 }}>🧠</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:11 }}>
              <div className="info-card"><strong>AVG ДОСВІД</strong><span style={{fontSize:20}}>{stats.averageXp}</span></div>
              <div className="info-card"><strong>AVG SCORE</strong><span style={{fontSize:20}}>{stats.averageScore}%</span></div>
              <div className="info-card"><strong>AVG TIME</strong><span style={{fontSize:20}}>{formatDuration(stats.averageDuration)}</span></div>
              <div className="info-card"><strong>STREAK</strong><span style={{fontSize:20}}>🔥 {stats.streak}</span></div>
            </div>
          </section>

          <section style={{ marginTop:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div>
                <div style={{ fontSize:10,fontWeight:900,letterSpacing:1,opacity:.5 }}>BATTLE HISTORY</div>
                <strong style={{ display:"block",marginTop:4,fontSize:15 }}>Recent 20 battles</strong>
              </div>
              <span style={{ fontSize:20 }}>🗂️</span>
            </div>

            {battleStatsLoading && <div style={{ padding:18,textAlign:"center",opacity:.55 }}>Loading battle history…</div>}
            {!battleStatsLoading && battleHistory.length === 0 && (
              <div style={{ padding:22,borderRadius:18,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)",textAlign:"center" }}>
                <div style={{fontSize:30}}>⚔️</div>
                <strong>Ще немає завершених батлів</strong>
                <p style={{margin:"7px 0 0",opacity:.5,fontSize:11}}>Зіграй перший батл — він зʼявиться тут автоматично.</p>
              </div>
            )}
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {battleHistory.map((battle, index) => (
                <div key={battle.id} style={{ padding:12,borderRadius:15,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.065)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:11,display:"grid",placeItems:"center",background:battle.correctAnswers >= 8 ? "rgba(74,222,128,.12)" : battle.correctAnswers >= 5 ? "rgba(250,204,21,.10)" : "rgba(255,255,255,.05)",fontSize:18 }}>{battle.correctAnswers >= 8 ? "🏆" : battle.correctAnswers >= 5 ? "⚡" : "🎯"}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}>
                        <strong style={{ fontSize:12 }}>#{battleHistory.length - index} · {battle.correctAnswers}/10 correct</strong>
                        <strong style={{ fontSize:12 }}>+{battle.xp} ДОСВІД</strong>
                      </div>
                      <div style={{ marginTop:4,fontSize:9,opacity:.48 }}>{battle.accuracy}% accuracy · {formatDuration(battle.durationSeconds)} · {formatDate(battle.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button type="button" onClick={() => setScreen("profile")} style={{ width:"100%",marginTop:14,border:0,borderRadius:14,padding:"12px",background:"rgba(255,255,255,.07)",color:"inherit",fontWeight:950,fontSize:11 }}>← НАЗАД ДО ПРОФІЛЮ</button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (screen === "profile") {
    const achievements = serverAchievements.length
      ? serverAchievements
      : ACHIEVEMENTS.map((achievement) => ({
          ...achievement,
          ...achievement.getProgress(player, dailyMissions, levelInfo.level),
        }));

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
          <style>{PROFILE_ANIMATION_KEYFRAMES}</style>
          {/* PROFILE HERO */}
          <section
            className="profile-hero"
            style={{
              padding: "24px 16px 20px",
              textAlign: "center",
              borderRadius: "20px",
              ...(PROFILE_BACKGROUND_STYLES[player.profileBackground || ""] || {
                background: "linear-gradient(145deg, rgba(124,77,255,0.18), rgba(255,255,255,0.035))",
              }),
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
                ...(PROFILE_ANIMATION_STYLES[player.profileAnimation || ""] || {}),
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
              {player.profileTitle || levelTitle}
              {" · "}
              LEVEL {levelInfo.level}
            </div>

            <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap", marginTop:9 }}>
              {player.profileTitle && <span style={{padding:"5px 8px",borderRadius:999,background:"rgba(255,255,255,.08)",fontSize:9,fontWeight:900}}>🏷️ {player.profileTitle}</span>}
              {player.victoryEffect && <span style={{padding:"5px 8px",borderRadius:999,background:"rgba(255,255,255,.08)",fontSize:9,fontWeight:900}}>{VICTORY_EFFECT_EMOJI[player.victoryEffect] || "✨"} {VICTORY_EFFECT_LABEL[player.victoryEffect] || "EFFECT"}</span>}
              {player.profileBackground && <span style={{padding:"5px 8px",borderRadius:999,background:"rgba(255,255,255,.08)",fontSize:9,fontWeight:900}}>🎨 {player.profileBackground.replace("_"," ").toUpperCase()}</span>}
              {player.profileAnimation && <span style={{padding:"5px 8px",borderRadius:999,background:"rgba(255,255,255,.08)",fontSize:9,fontWeight:900}}>{PROFILE_ANIMATION_EMOJI[player.profileAnimation] || "🎞️"} {PROFILE_ANIMATION_LABEL[player.profileAnimation] || "ANIMATION"}</span>}
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
                  ДОСВІД PROGRESS
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

          {/* LEVEL REWARDS */}
          <section
            style={{
              marginTop: "14px",
              padding: "14px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.07)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.5, fontWeight: 900, letterSpacing: "0.08em" }}>LEVEL REWARDS</div>
                <strong style={{ display: "block", marginTop: 4, fontSize: 15 }}>Unlock as you level up</strong>
              </div>
              <div style={{ fontSize: 24 }}>🎁</div>
            </div>
            {rewardNotice && <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 10, background: "rgba(124,77,255,0.14)", border: "1px solid rgba(124,77,255,0.24)", fontSize: 11, fontWeight: 800 }}>{rewardNotice}</div>}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 9 }}>
              {levelRewards.map((reward) => {
                const unlocked = levelInfo.level >= reward.level;
                return (
                  <div key={reward.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 13, background: unlocked ? "rgba(124,77,255,0.10)" : "rgba(255,255,255,0.025)", border: unlocked ? "1px solid rgba(124,77,255,0.20)" : "1px solid rgba(255,255,255,0.05)", opacity: unlocked ? 1 : 0.58 }}>
                    <div style={{ width: 38, height: 38, flex: "0 0 38px", borderRadius: 11, display: "grid", placeItems: "center", fontSize: 20, background: "rgba(124,77,255,0.14)" }}>{reward.icon}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 900 }}>{reward.title}</div>
                      <div style={{ marginTop: 2, fontSize: 9, opacity: 0.52 }}>LEVEL {reward.level} · {reward.description}</div>
                    </div>
                    <button disabled={!unlocked || reward.claimed || rewardsLoading || rewardBusy === reward.id} onClick={() => void claimLevelReward(reward.id)} style={{ border: 0, borderRadius: 9, padding: "8px 10px", background: reward.claimed ? "rgba(255,255,255,0.07)" : unlocked ? "#7c4dff" : "rgba(255,255,255,0.05)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: unlocked && !reward.claimed ? "pointer" : "default", whiteSpace: "nowrap" }}>
                      {reward.claimed ? "✓ UNLOCKED" : unlocked ? (rewardBusy === reward.id ? "…" : "ЗАБРАТИ") : "🔒"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* СТАТИСТИКА ГРАВЦЯ 2.0 */}
          <section
            style={{
              marginTop: "14px",
              padding: "14px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.07)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.5, fontWeight: 900, letterSpacing: "0.08em" }}>СТАТИСТИКА ГРАВЦЯ</div>
                <strong style={{ display: "block", marginTop: 4, fontSize: 15 }}>Your BATTLE IQ profile</strong>
              </div>
              <div style={{ fontSize: 23 }}>{equippedFrame ? (PROFILE_FRAME_EMOJI[equippedFrame] || "✨") : "🧠"}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
              {[
                ["⚔️", player.battles.toLocaleString(), "BATTLES"],
                ["🎯", player.battles > 0 ? `${Math.round((player.totalCorrect / (player.battles * 10)) * 100)}%` : "0%", "ACCURACY"],
                ["🔥", player.bestCombo.toLocaleString(), "BEST КОМБО"],
              ].map(([icon, value, label]) => (
                <div key={label} style={{ padding: "11px 8px", borderRadius: 13, background: "rgba(124,77,255,0.08)", border: "1px solid rgba(124,77,255,0.12)", textAlign: "center", minWidth: 0 }}>
                  <div style={{ fontSize: 16 }}>{icon}</div>
                  <strong style={{ display: "block", marginTop: 4, fontSize: 16 }}>{value}</strong>
                  <div style={{ marginTop: 3, fontSize: 8, opacity: 0.48, fontWeight: 900, whiteSpace: "nowrap" }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
              <div style={{ padding: "10px 11px", borderRadius: 12, background: "rgba(255,255,255,0.035)" }}>
                <div style={{ fontSize: 9, opacity: 0.5, fontWeight: 900 }}>ACHIEVEMENTS</div>
                <strong style={{ display: "block", marginTop: 4, fontSize: 14 }}>{unlockedAchievements}/{achievements.length} unlocked</strong>
              </div>
              <button type="button" onClick={() => setScreen("collection")} style={{ padding: "10px 11px", borderRadius: 12, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", color: "inherit", textAlign: "left", cursor: "pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize: 9, opacity: 0.5, fontWeight: 900 }}>COLLECTION</div>
                    <strong style={{ display: "block", marginTop: 4, fontSize: 14 }}>{inventory.filter((item) => Number(item.quantity || 0) > 0).length} unique</strong>
                  </div>
                  <span style={{ fontSize: 16 }}>→</span>
                </div>
              </button>
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
                "TOTAL ДОСВІД",
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
                BEST КОМБО
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
                BEST BATTLE ДОСВІД
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

          <button
            type="button"
            onClick={() => void openBattleStats()}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "14px 15px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(124,77,255,.16), rgba(60,170,255,.08))",
              border: "1px solid rgba(124,77,255,.20)",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
              <div>
                <div style={{ fontSize:10,opacity:.5,fontWeight:900,letterSpacing:"0.08em" }}>BATTLE ANALYTICS</div>
                <strong style={{ display:"block",marginTop:4,fontSize:15 }}>History & full statistics</strong>
                <span style={{ display:"block",marginTop:3,fontSize:9,opacity:.48 }}>Server data from your completed battles</span>
              </div>
              <span style={{ fontSize:24 }}>📊</span>
            </div>
          </button>

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

                      <span
                        style={{
                          display: "block",
                          marginTop: "5px",
                          fontSize: "9px",
                          fontWeight: 800,
                          color: achievement.unlocked ? "#c4b5fd" : "rgba(255,255,255,0.42)",
                        }}
                      >
                        🎁 Reward: +{achievement.reward?.amount ?? achievement.rewardXp ?? 0} ДОСВІД
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
                      achievement.rewardClaimed ? (
                        <div
                          style={{
                            flex: "0 0 auto",
                            padding: "6px 8px",
                            borderRadius: "9px",
                            background: "rgba(34,197,94,0.12)",
                            color: "#86efac",
                            fontSize: "9px",
                            fontWeight: 900,
                          }}
                        >
                          ✓ ЗАБРАНО
                        </div>
                      ) : (
                        <button
                          onClick={() => void claimAchievementReward(achievement.id)}
                          style={{
                            flex: "0 0 auto",
                            border: 0,
                            borderRadius: "9px",
                            padding: "7px 10px",
                            background: "linear-gradient(135deg,#7c4dff,#a855f7)",
                            color: "white",
                            fontSize: "9px",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          CLAIM +{achievement.reward?.amount ?? achievement.rewardXp ?? 0} ДОСВІД
                        </button>
                      )
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
                        {xp} ДОСВІД
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
                  `https://t.me/batleiqbot?startapp=friend_${myId}`;

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
                        ДОСВІД
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

    const totalПитанняs =
      gameПитанняs.length;

    const accuracy =
      totalПитанняs > 0
        ? Math.round(
            (score / totalПитанняs) * 100
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
          90 - timeLeft
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
          {player.victoryEffect && (
            <div style={{
              marginTop:10,padding:"9px 12px",borderRadius:999,
              background:"rgba(124,77,255,.10)",
              border:"1px solid rgba(124,77,255,.20)",
              fontSize:10,fontWeight:950
            }}>
              {VICTORY_EFFECT_EMOJI[player.victoryEffect] || "✨"} {VICTORY_EFFECT_LABEL[player.victoryEffect] || "VICTORY EFFECT"} АКТИВНО
            </div>
          )}

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
              {score}/{totalПитанняs}
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
              <span>ДОСВІД earned</span>
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

          {eventBonusXp > 0 && (
            <section
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "11px 12px",
                borderRadius: "14px",
                background: "rgba(124,77,255,0.09)",
                border: "1px solid rgba(124,77,255,0.18)",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "10px", opacity: 0.5, fontWeight: 900, letterSpacing: "0.08em" }}>BATTLE EVENTS</div>
              <div style={{ marginTop: "5px", fontSize: "11px", fontWeight: 800 }}>
                ⚡ Speed Round · 1.5× ДОСВІД
              </div>
              <div style={{ marginTop: "3px", fontSize: "11px", fontWeight: 800 }}>
                ⚡ Double ДОСВІД · Final Round
              </div>
              <div style={{ marginTop: "5px", fontSize: "10px", opacity: 0.62 }}>
                +{eventBonusXp} ДОСВІД from battle events
              </div>
            </section>
          )}

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
              ["❤️", `${livesLost}`, "ЖИТТЯ LOST"],
              ["✅", `${correctCount}`, "ПРАВИЛЬНО"],
              ["❌", `${wrongCount}`, "WRONG"],
              ["⌛", `${timeoutCount}`, "TIMEOUT"],
              ["🎯", `${totalПитанняs}`, "QUESTIONS"],
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
                📊 ПИТАННЯ REVIEW
              </strong>
              <span
                style={{
                  fontSize: "9px",
                  opacity: 0.5,
                }}
              >
                {questionResults.length}/{totalПитанняs}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {gameПитанняs.map((_question, index) => {
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
        title: "ДОСВІД Boost",
        text: "+50% ДОСВІД за цей бій.",
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
                      <div style={{ marginTop: 5, fontSize: 9, fontWeight: 800, opacity: 0.48 }}>Є ×{quantity}</div>
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

  if (!currentПитання) {
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

        .biqBattleMeta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 92px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          margin: 8px 0 10px;
        }

        .biqMetaCard {
          min-width: 0;
          min-height: 74px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 8px;
          border-radius: 15px;
          background: linear-gradient(145deg, rgba(124,77,255,0.08), rgba(255,255,255,0.025));
          border: 1px solid rgba(124,77,255,0.18);
          box-sizing: border-box;
        }

        .biqMetaDifficulty {
          border-color: rgba(255,181,46,0.18);
          background: linear-gradient(145deg, rgba(255,181,46,0.07), rgba(255,255,255,0.025));
        }

        .biqMetaIcon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(124,77,255,0.13);
          font-size: 17px;
        }

        .biqMetaDifficulty .biqMetaIcon {
          background: rgba(255,181,46,0.12);
        }

        .biqMetaCard small {
          display: block;
          font-size: 8px;
          font-weight: 800;
          opacity: 0.52;
          margin-bottom: 3px;
        }

        .biqMetaCard strong {
          display: block;
          font-size: 10px;
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .biqMetaDifficulty strong {
          color: #ffd166;
        }

        .biqTimerHero {
          position: relative;
          width: 92px;
          min-height: 92px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }

        .biqTimerHeroGlow {
          position: absolute;
          width: 94px;
          height: 94px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,181,46,0.14) 0%, rgba(124,77,255,0.05) 42%, transparent 72%);
          filter: blur(3px);
          pointer-events: none;
        }

        .biqTimerHeroCircle {
          position: relative;
          width: 82px;
          height: 82px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          padding: 5px;
          box-sizing: border-box;
          transition: background 0.25s ease, box-shadow 0.25s ease;
          z-index: 1;
        }

        .biqTimerHeroCircle::before {
          content: "";
          position: absolute;
          inset: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.07), rgba(7,6,20,0.99) 67%);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        }

        .biqTimerHeroInner {
          position: relative;
          z-index: 2;
          width: 68px;
          height: 68px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .biqTimerHeroInner strong {
          font-size: 31px;
          font-weight: 950;
          letter-spacing: -2px;
          text-shadow: 0 0 14px currentColor;
        }

        .biqTimerHeroInner span {
          margin-top: 3px;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 1px;
          opacity: 0.85;
        }

        .biqTotalTimerHero {
          position: absolute;
          right: -4px;
          bottom: -2px;
          z-index: 3;
          padding: 3px 6px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 7px;
          background: rgba(10,8,24,0.96);
          color: rgba(255,255,255,0.52);
          font-size: 7px;
          font-weight: 900;
          white-space: nowrap;
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

        @keyframes biqMilestonePop {
          0% { transform: translateX(-50%) scale(0.86); opacity: 0; }
          70% { transform: translateX(-50%) scale(1.04); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>

      <main className="battle-screen">
        {battleMilestone && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "18%",
              transform: "translateX(-50%)",
              zIndex: 1200,
              width: "min(310px, calc(100vw - 32px))",
              padding: "16px 18px",
              borderRadius: "20px",
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(124,77,255,0.96), rgba(168,85,247,0.94))",
              boxShadow: "0 18px 55px rgba(0,0,0,0.38)",
              animation: "biqMilestonePop 0.28s ease-out",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: "30px" }}>{battleMilestone.icon}</div>
            <div style={{ marginTop: "4px", fontSize: "18px", fontWeight: 950 }}>
              {battleMilestone.title}
            </div>
            <div style={{ marginTop: "3px", fontSize: "10px", opacity: 0.78, fontWeight: 800 }}>
              {battleMilestone.subtitle}
            </div>
          </div>
        )}

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
              {gameПитанняs.length}
            </span>
          </div>

        </div>

        <div className="biqBattleMeta">
          <div className="biqMetaCard biqMetaCategory">
            <span className="biqMetaIcon">🧠</span>
            <div>
              <small>Категорія</small>
              <strong>{currentПитання.category || "Загальні знання"}</strong>
            </div>
          </div>

          <div className="biqTimerHero" aria-label={`Залишилось ${questionTimeLeft} секунд`}>
            <div className="biqTimerHeroGlow" />
            <div
              className="biqTimerHeroCircle"
              style={{
                background: `conic-gradient(${questionTimeLeft <= 3 ? "#ff5475" : "#ffb52e"} ${Math.max(0, Math.min(100, (questionTimeLeft / 8) * 100))}%, rgba(255,255,255,0.08) 0)`,
                animation: questionTimeLeft <= 3 ? "biqTimerDanger 0.65s ease-in-out infinite" : undefined,
                boxShadow: questionTimeLeft <= 3
                  ? "0 0 28px rgba(255,84,117,0.42), inset 0 0 18px rgba(255,84,117,0.12)"
                  : "0 0 26px rgba(255,181,46,0.26), inset 0 0 18px rgba(255,181,46,0.08)",
              }}
            >
              <div className="biqTimerHeroInner" style={{ color: questionTimeLeft <= 3 ? "#ff7187" : "#ffd166" }}>
                <strong>{questionTimeLeft}</strong>
                <span>СЕКУНД</span>
              </div>
            </div>
            <div className="biqTotalTimerHero">⏱ {timeLeft} с</div>
          </div>

          <div className="biqMetaCard biqMetaDifficulty">
            <span className="biqMetaIcon">📊</span>
            <div>
              <small>Складність</small>
              <strong>{String(currentПитання.difficulty || "easy").toLowerCase().includes("hard") ? "Складна" : String(currentПитання.difficulty || "").toLowerCase().includes("medium") ? "Середня" : "Легка"}</strong>
            </div>
          </div>
        </div>

        <div className="question-progress">
          <div
            style={{
              width: `${
                ((questionIndex + 1) /
                  gameПитанняs.length) *
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
              ПРАВИЛЬНО
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
              КОМБО
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
              ЖИТТЯ
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
              ДОСВІД
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
            🔥 КОМБО x
            {Math.min(
              3,
              1 +
                Math.floor(
                  battleCombo / 3
                )
            )}
            {" — "}
            Продовжуй серію!
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
          <span>❤️ ДРУГИЙ ШАНС</span>
          <span>{secondChanceAvailable ? "ГОТОВО" : "—"}</span>
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
          <span>🛡️ КОМБО SHIELD</span>
          <span>{comboShieldAvailable ? "ГОТОВО" : "—"}</span>
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
            ⚡ ДОСВІД BOOST АКТИВНО · +50% ДОСВІД
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

        {isSpeedRound && (
          <div
            style={{
              marginBottom: "10px",
              padding: "10px 12px",
              borderRadius: "13px",
              background: "rgba(34,211,238,0.10)",
              border: "1px solid rgba(34,211,238,0.24)",
              textAlign: "center",
              animation: "biqComboBurst 0.45s ease-out",
            }}
          >
            <div style={{ fontSize: "15px" }}>⚡ ШВИДКИЙ РАУНД</div>
            <div style={{ marginTop: "3px", fontSize: "10px", opacity: 0.68 }}>
              10 seconds · 1.5× ДОСВІД
            </div>
          </div>
        )}

        {isDoubleXpRound && (
          <div
            style={{
              marginBottom: "10px",
              padding: "10px 12px",
              borderRadius: "13px",
              background: "rgba(250,204,21,0.10)",
              border: "1px solid rgba(250,204,21,0.24)",
              textAlign: "center",
              animation: "biqComboBurst 0.45s ease-out",
            }}
          >
            <div style={{ fontSize: "15px" }}>⚡ DOUBLE ДОСВІД</div>
            <div style={{ marginTop: "3px", fontSize: "10px", opacity: 0.68 }}>
              Final round · 2× ДОСВІД
            </div>
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

          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              margin: "7px 0 10px",
            }}
          >
            {currentПитання.category && (
              <span
                style={{
                  padding: "5px 8px",
                  borderRadius: "999px",
                  background: "rgba(124,77,255,0.10)",
                  border: "1px solid rgba(124,77,255,0.18)",
                  fontSize: "9px",
                  fontWeight: 900,
                  opacity: 0.75,
                }}
              >
                {currentПитання.category}
              </span>
            )}

            <span
              style={{
                padding: "5px 8px",
                borderRadius: "999px",
                background:
                  String(currentПитання.difficulty || "").toLowerCase().includes("hard")
                    ? "rgba(248,113,113,0.10)"
                    : String(currentПитання.difficulty || "").toLowerCase().includes("medium")
                    ? "rgba(251,191,36,0.10)"
                    : "rgba(74,222,128,0.10)",
                border:
                  String(currentПитання.difficulty || "").toLowerCase().includes("hard")
                    ? "1px solid rgba(248,113,113,0.18)"
                    : String(currentПитання.difficulty || "").toLowerCase().includes("medium")
                    ? "1px solid rgba(251,191,36,0.18)"
                    : "1px solid rgba(74,222,128,0.18)",
                fontSize: "9px",
                fontWeight: 900,
              }}
            >
              {String(currentПитання.difficulty || "easy").toUpperCase()}
            </span>
          </div>

          <h1>
            {currentПитання.question}
          </h1>

          <p>
            Choose the correct
            answer
          </p>
        </section>

        <div className="answers">
          {currentПитання.answers.map(
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
                    answerПитання(
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
            +{battleXp} ДОСВІД
          </span>
        </div>
      </main>
    </div>
  );
}

export default App;
