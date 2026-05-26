export type TelegramLoginStatus =
  | 'idle'
  | 'waiting'
  | 'confirmed'
  | 'declined'
  | 'expired'
  | 'error';

export interface TelegramLoginInitResponse {
  token: string;
  bot_username: string;
  login_url: string;
}

export interface TelegramPollResponse {
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
  token?: string;
  user?: {
    id: number;
    name: string;
    username?: string;
    photo_url?: string;
  };
}

export interface TelegramUserProfile {
  id: number;
  name: string;
  username?: string;
  photo_url?: string;
}
