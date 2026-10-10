import type { NextAuthConfig } from "next-auth";

// Configuração "edge-safe": sem providers que dependem do Prisma/Node.
// Usada pelo middleware (Edge Runtime) só para checar se existe sessão válida e qual o
// papel. A configuração completa (com os Credentials providers) está em src/lib/auth.ts.
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        const sessionUser = user as { id: string; role: "ADMIN" | "CLIENT"; clientId?: string };
        token.id = sessionUser.id;
        token.role = sessionUser.role;
        if (sessionUser.clientId) token.clientId = sessionUser.clientId;
      }
      return token;
    },
    session: ({ session, token }) => {
      const sessionToken = token as unknown as {
        id: string;
        role: "ADMIN" | "CLIENT";
        clientId?: string;
      };
      if (session.user) {
        session.user.id = sessionToken.id;
        session.user.role = sessionToken.role;
        if (sessionToken.clientId) session.user.clientId = sessionToken.clientId;
      }
      return session;
    },
  },
};
