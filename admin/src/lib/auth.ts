import { env } from "@/lib/env";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// Backend handles actual DB operations now

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          if (!data.token || !data.user) return null;

          return {
            id: String(data.user.id),
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            backendToken: data.token,
          };
        } catch (e) {
          console.error("Failed to authenticate with backend", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.backendToken = (user as any).backendToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).backendToken = token.backendToken;
      }
      return session;
    },
  },
});
