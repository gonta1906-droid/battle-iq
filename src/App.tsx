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
};

const QUESTIONS: Question[] = [
  {
    question: "Яка планета найближча до Сонця?",
    answers: [
      { text: "Венера", correct: false },
      { text: "Меркурій", correct: true },
      { text: "Марс", correct: false },
      { text: "Земля", correct: false },
    ],
  },

  {
    question: "Скільки континентів на Землі?",
    answers: [
      { text: "5", correct: false },
      { text: "6", correct: false },
      { text: "7", correct: true },
      { text: "8", correct: false },
    ],
  },

  {
    question: "Який океан найбільший?",
    answers: [
      { text: "Атлантичний", correct: false },
      { text: "Індійський", correct: false },
      {
        text: "Північний Льодовитий",
        correct: false,
      },
      { text: "Тихий", correct: true },
    ],
  },

  {
    question: "Скільки хвилин у двох годинах?",
    answers: [
      { text: "100", correct: false },
      { text: "120", correct: true },
      { text: "140", correct: false },
      { text: "160", correct: false },
    ],
  },

  {
    question: "Яка тварина є найбільшою на планеті?",
    answers: [
      { text: "Слон", correct: false },
      { text: "Жираф", correct: false },
      { text: "Синій кит", correct: true },
      { text: "Акула", correct: false },
    ],
  },

  {
    question: "Яка столиця Франції?",
    answers: [
      { text: "Рим", correct: false },
      { text: "Мадрид", correct: false },
      { text: "Париж", correct: true },
      { text: "Берлін", correct: false },
    ],
  },

  {
    question: "Скільки днів у високосному році?",
    answers: [
      { text: "365", correct: false },
      { text: "366", correct: true },
      { text: "364", correct: false },
      { text: "367", correct: false },
    ],
  },

  {
    question: "Який газ переважає в атмосфері Землі?",
    answers: [
      { text: "Кисень", correct: false },
      { text: "Водень", correct: false },
      { text: "Азот", correct: true },
      {
        text: "Вуглекислий газ",
        correct: false,
      },
    ],
  },

  {
    question: "Скільки сторін має шестикутник?",
    answers: [
      { text: "5", correct: false },
      { text: "6", correct: true },
      { text: "7", correct: false },
      { text: "8", correct: false },
    ],
  },

  {
    question: "Який метал позначається символом Au?",
    answers: [
      { text: "Срібло", correct: false },
      { text: "Золото", correct: true },
      { text: "Мідь", correct: false },
      { text: "Залізо", correct: false },
    ],
  },

  {
    question: "Скільки планет у Сонячній системі?",
    answers: [
      { text: "7", correct: false },
      { text: "8", correct: true },
      { text: "9", correct: false },
      { text: "10", correct: false },
    ],
  },

  {
    question: "Яка найбільша тварина на суші?",
    answers: [
      { text: "Носоріг", correct: false },
      { text: "Бегемот", correct: false },
      {
        text: "Африканський слон",
        correct: true,
      },
      { text: "Жираф", correct: false },
    ],
  },
];

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

function loadPlayer(): PlayerData {
  try {
    const saved = localStorage.getItem(
      "battle_iq_player"
    );

    if (saved) {
      const parsed = JSON.parse(saved);

      return {
        xp: Number(parsed.xp) || 0,
        streak: Number(parsed.streak) || 0,
        battles: Number(parsed.battles) || 0,
        totalCorrect:
          Number(parsed.totalCorrect) || 0,
        bestCombo:
          Number(parsed.bestCombo) || 0,
      };
    }
  } catch {}

  return {
    xp: 0,
    streak: 0,
    battles: 0,
    totalCorrect: 0,
    bestCombo: 0,
  };
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

  const [battleCombo, setBattleCombo] =
    useState(0);

  const [player, setPlayer] =
    useState<PlayerData>(() =>
      loadPlayer()
    );

  const [gameQuestions, setGameQuestions] =
    useState<Question[]>([]);

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
  // SAVE PLAYER
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      "battle_iq_player",
      JSON.stringify(player)
    );
  }, [player]);

  useEffect(() => {
    localStorage.setItem(
      "battle_iq_daily_missions",
      JSON.stringify(dailyMissions)
    );
  }, [dailyMissions]);

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

    const selectedQuestions =
      shuffle(QUESTIONS).slice(0, 10);

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

    setPlayer((current) => ({
      ...current,
      xp:
        current.xp + battleXp,
      streak:
        current.streak + 1,
      battles:
        current.battles + 1,
      totalCorrect:
        current.totalCorrect + score,
      bestCombo:
        Math.max(
          current.bestCombo,
          battleCombo
        ),
    }));

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

      const earnedXp =
        50 + speedBonus;

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
                #1,842
              </strong>
            </div>
          </section>

          <section className="hero-card">
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
                  10
                </strong>

                <span>
                  Questions
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
                  You're #1,842
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
                  Coming soon
                </span>
              </div>
            </div>

            <button className="challenge-button">
              INVITE
            </button>
          </section>
        </main>

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

      setPlayer((current) => ({
        ...current,
        xp: current.xp + reward,
      }));

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
    const achievements = [
      {
        icon: "🎯",
        title: "First Battle",
        text: "Complete your first battle",
        unlocked:
          player.battles >= 1,
      },

      {
        icon: "🔥",
        title: "First Streak",
        text: "Reach a 3 day streak",
        unlocked:
          player.streak >= 3,
      },

      {
        icon: "🧠",
        title: "Brain Master",
        text: "Earn 5,000 XP",
        unlocked:
          player.xp >= 5000,
      },

      {
        icon: "🏆",
        title: "Top 1000",
        text: "Reach the top 1000",
        unlocked: false,
      },
    ];

    return (
      <div className="app">
        <div className="glow glow-one" />

        <Header />

        <main className="profile-page">
          <section className="profile-hero">
            <div className="profile-big-avatar">
              😎
            </div>

            <h1>
              {telegramUser?.first_name ||
                "SERGIO"}
            </h1>

            <div className="profile-level">
              LEVEL{" "}
              {levelInfo.level}
            </div>

            <div className="profile-xp">
              <div className="profile-xp-top">
                <span>
                  XP PROGRESS
                </span>

                <span>
                  {
                    levelInfo.currentXp.toLocaleString()
                  }{" "}
                  /{" "}
                  {
                    levelInfo.requiredXp.toLocaleString()
                  }
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
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <span>⚔️</span>

              <strong>
                {player.battles}
              </strong>

              <small>
                BATTLES
              </small>
            </div>

            <div className="stat-card">
              <span>🔥</span>

              <strong>
                {player.streak}
              </strong>

              <small>
                STREAK
              </small>
            </div>

            <div className="stat-card">
              <span>⚡</span>

              <strong>
                {player.xp.toLocaleString()}
              </strong>

              <small>
                TOTAL XP
              </small>
            </div>

            <div className="stat-card">
              <span>🏆</span>

              <strong>
                #1,842
              </strong>

              <small>
                RANK
              </small>
            </div>
          </section>

          <div className="profile-section-title">
            <h2>
              Achievements
            </h2>

            <span>
              {
                achievements.filter(
                  (item) =>
                    item.unlocked
                ).length
              }
              /
              {
                achievements.length
              }
            </span>
          </div>

          <section className="achievements">
            {achievements.map(
              (achievement) => (
                <div
                  className={`achievement ${
                    achievement.unlocked
                      ? "unlocked"
                      : "locked"
                  }`}
                  key={
                    achievement.title
                  }
                >
                  <div className="achievement-icon">
                    {achievement.unlocked
                      ? achievement.icon
                      : "🔒"}
                  </div>

                  <div>
                    <strong>
                      {
                        achievement.title
                      }
                    </strong>

                    <span>
                      {
                        achievement.text
                      }
                    </span>
                  </div>

                  {achievement.unlocked && (
                    <b>✓</b>
                  )}
                </div>
              )
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

    const worldPlayers = [
      ["Alex", "12,840", "🥇", "+3"],
      ["Max", "11,920", "🥈", "−1"],
      ["Daniel", "11,540", "🥉", "+7"],
      ["Vlad", "10,880", "", "+12"],
      ["Nikita", "10,210", "", "−4"],
      [
        currentName,
        player.xp.toLocaleString(),
        "",
        "+18",
      ],
    ];

    const friendPlayers = [
      [
        currentName,
        player.xp.toLocaleString(),
        "",
        "—",
      ],
      ["Alex", "4,820", "", "+2"],
      ["Max", "3,950", "", "−1"],
      ["Daniel", "2,740", "", "+4"],
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

    const handleChallenge = (name: string) => {
      const webApp = getTelegramWebApp();

      webApp?.HapticFeedback?.impactOccurred(
        "medium"
      );

      setChallengeNotice(
        `⚔️ Challenge prepared for ${name}. PvP will be connected next.`
      );

      window.setTimeout(() => {
        setChallengeNotice("");
      }, 3000);
    };

    return (
      <div className="app">
        <div className="glow glow-one" />

        <Header />

        <main className="ranking-page">
          <div className="ranking-heading">
            <span>🏆</span>

            <div>
              <h1>
                {rankingTab === "world"
                  ? "GLOBAL RANKING"
                  : "FRIENDS RANKING"}
              </h1>

              <p>
                {rankingTab === "world"
                  ? "Compete with players worldwide"
                  : "Compete with your friends"}
              </p>
            </div>
          </div>

          <div className="ranking-tabs">
            <button
              className={`ranking-tab ${
                rankingTab === "world"
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setRankingTab("world");
                setRankingSearch("");
                setChallengeNotice("");
              }}
            >
              🌍 World
            </button>

            <button
              className={`ranking-tab ${
                rankingTab === "friends"
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setRankingTab("friends");
                setRankingSearch("");
                setChallengeNotice("");
              }}
            >
              👥 Friends
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              margin: "14px 0",
            }}
          >
            <input
              value={rankingSearch}
              onChange={(event) =>
                setRankingSearch(
                  event.target.value
                )
              }
              placeholder="🔎 Search player..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.10)",
                background:
                  "rgba(255,255,255,0.06)",
                color: "inherit",
                outline: "none",
                fontSize: "14px",
              }}
            />
          </div>

          {challengeNotice && (
            <div
              style={{
                marginBottom: "12px",
                padding: "11px 13px",
                borderRadius: "12px",
                background:
                  "rgba(124, 77, 255, 0.16)",
                border:
                  "1px solid rgba(124, 77, 255, 0.30)",
                fontSize: "12px",
                lineHeight: 1.4,
              }}
            >
              {challengeNotice}
            </div>
          )}

          <section className="leaderboard">
            {filteredPlayers.map(
              ([name, xp, medal, movement], index) => {
                const isCurrentPlayer =
                  name === currentName;

                const isTopThree =
                  rankingTab === "world" &&
                  index < 3 &&
                  rankingSearch.trim().length === 0;

                return (
                  <div
                    className={`leader-row ${
                      isCurrentPlayer
                        ? "current-player"
                        : ""
                    }`}
                    key={`${name}-${index}`}
                    style={{
                      position: "relative",
                    }}
                  >
                    <div className="leader-position">
                      {isTopThree
                        ? medal
                        : `#${index + 1}`}
                    </div>

                    <div className="leader-avatar">
                      {isCurrentPlayer
                        ? "😎"
                        : [
                            "🧑",
                            "👨",
                            "👽",
                            "🤠",
                            "🦊",
                          ][index] ||
                          "👤"}
                    </div>

                    <div
                      className="leader-info"
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <strong>
                        {name}

                        {isCurrentPlayer && (
                          <span className="you-badge">
                            YOU
                          </span>
                        )}
                      </strong>

                      <span>
                        LEVEL{" "}
                        {isCurrentPlayer
                          ? levelInfo.level
                          : Math.max(
                              1,
                              20 - index
                            )}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          opacity:
                            movement === "—"
                              ? 0.5
                              : 0.8,
                        }}
                      >
                        {movement}
                      </span>

                      <div className="leader-xp">
                        {xp}

                        <small>
                          XP
                        </small>
                      </div>
                    </div>

                    {rankingTab === "friends" &&
                      !isCurrentPlayer && (
                        <button
                          onClick={() =>
                            handleChallenge(name)
                          }
                          style={{
                            marginLeft: "8px",
                            border: "0",
                            borderRadius: "9px",
                            padding: "7px 9px",
                            background:
                              "rgba(124, 77, 255, 0.20)",
                            color: "inherit",
                            fontSize: "10px",
                            fontWeight: 800,
                            cursor: "pointer",
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
                  padding: "30px 12px",
                  textAlign: "center",
                  opacity: 0.65,
                }}
              >
                No players found.
              </div>
            )}
          </section>

          <div className="your-rank-card">
            <span>
              {rankingTab === "world"
                ? "YOUR GLOBAL RANK"
                : "YOUR FRIEND RANK"}
            </span>

            <strong>
              #
              {rankingTab === "world"
                ? "1,842"
                : "1"}
            </strong>

            <small>
              {rankingTab === "world"
                ? "Keep playing to climb higher ⚡"
                : "Challenge your friends ⚔️"}
            </small>
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
            +{battleXp} XP
          </span>
        </div>
      </main>
    </div>
  );
}

export default App;