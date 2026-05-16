import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_SERVICE_URL = "http://127.0.0.1:3001";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Verify credentials against Python api-service
        try {
          const res = await fetch(`${API_SERVICE_URL}/api/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            throw new Error("Invalid email or password");
          }

          const user = await res.json();

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
          };
        } catch (error) {
          if (error instanceof Error && error.message === "Invalid email or password") {
            throw error;
          }
          throw new Error("Authentication service unavailable");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session: updateData }) {
      // Initial sign-in: store user data in the JWT token
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.avatar = (user as { avatar?: string | null }).avatar;
        token.xpPoints = (user as { xpPoints?: number }).xpPoints;
        token.currentLevel = (user as { currentLevel?: number }).currentLevel;
      }

      // When update() is called from the client, persist the updated fields
      if (trigger === "update" && updateData) {
        if (updateData.name) {
          token.name = updateData.name;
        }
        if (updateData.avatar) {
          token.avatar = updateData.avatar;
        }
        if (updateData.xpPoints !== undefined) {
          token.xpPoints = updateData.xpPoints;
        }
        if (updateData.currentLevel !== undefined) {
          token.currentLevel = updateData.currentLevel;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
