import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
      role: string;
      xpPoints?: number;
      currentLevel?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
    role: string;
    xpPoints?: number;
    currentLevel?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    avatar?: string | null;
    xpPoints?: number;
    currentLevel?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    avatar?: string | null;
  }
}
