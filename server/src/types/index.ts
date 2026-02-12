export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  discordRoles?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
  discordId?: string;
  discordUsername?: string;
  discordRoles?: string[];
}

export interface DiscordGuildMember {
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  roles: string[];
  nick?: string;
}
