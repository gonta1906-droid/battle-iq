declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramWebApp = {
  initData: string;

  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    start_param?: string;
  };

  ready: () => void;
  expand: () => void;

  close: () => void;

  setHeaderColor: (
    color: string
  ) => void;

  setBackgroundColor: (
    color: string
  ) => void;

  HapticFeedback?: {
    impactOccurred: (
      style:
        | "light"
        | "medium"
        | "heavy"
    ) => void;

    notificationOccurred: (
      type:
        | "error"
        | "success"
        | "warning"
    ) => void;

    selectionChanged: () => void;
  };
};

export function getTelegramWebApp() {
  return (
    window.Telegram?.WebApp ??
    null
  );
}

export function getTelegramUser(): TelegramUser | null {
  return (
    window.Telegram?.WebApp
      ?.initDataUnsafe?.user ??
    null
  );
}