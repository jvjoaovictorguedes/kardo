import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { consumeClientInviteToken } from "@/lib/invite";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "staff",
      name: "Equipe",
      credentials: {
        email: { label: "E-mail" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.staffUser.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: "ADMIN" as const };
      },
    }),
    Credentials({
      id: "client-invite",
      name: "Cliente",
      credentials: {
        token: { label: "Token" },
      },
      authorize: async (credentials) => {
        const token = credentials?.token;
        if (typeof token !== "string" || !token) return null;

        const contact = await consumeClientInviteToken(token);
        if (!contact) return null;

        return {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          role: "CLIENT" as const,
          clientId: contact.clientId,
        };
      },
    }),
  ],
});
