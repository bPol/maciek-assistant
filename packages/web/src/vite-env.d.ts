/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_ALLOWED_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type GoogleIdConfig = {
  client_id: string;
  callback: (response: { credential: string }) => void;
  cancel_on_tap_outside?: boolean;
};

type GoogleIdButtonConfig = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  type?: "standard" | "icon";
};

interface Window {
  google?: {
    accounts?: {
      id?: {
        initialize: (config: GoogleIdConfig) => void;
        renderButton: (element: HTMLElement, config: GoogleIdButtonConfig) => void;
        disableAutoSelect?: () => void;
      };
    };
  };
}
