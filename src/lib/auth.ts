import { NextAuthOptions, type User, type Session } from "next-auth";
import { type JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRepository } from "@/repositories/userRepository";
import { AuthService } from "@/services/authService";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const inputEmail = credentials.email.trim().toLowerCase();
          const inputPassword = credentials.password.trim();

          let user = await UserRepository.findByEmail(inputEmail);

          // Auto-seed default admin account if table is empty
          if (!user) {
            const userCount = await prisma.user.count().catch(() => 0);
            if (userCount === 0) {
              const defaultHash = await bcrypt.hash('admin123', 10);
              user = await prisma.user.create({
                data: {
                  name: 'System Admin',
                  email: 'admin@ricemill.com',
                  passwordHash: defaultHash,
                  role: 'ADMIN',
                  isActive: true,
                }
              }).catch(() => null);
            }
          }

          if (!user || !user.isActive) {
            return null;
          }

          let isPasswordValid = await AuthService.verifyPassword(inputPassword, user.passwordHash);
          
          // Fallback check for plain string in case raw password was saved
          if (!isPasswordValid && inputPassword === user.passwordHash) {
            isPasswordValid = true;
          }

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 9 * 60, // 9 minutes (540 seconds)
  },
  jwt: {
    maxAge: 9 * 60, // 9 minutes (540 seconds)
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-rice-mill-key-2026-secure-random',
};
