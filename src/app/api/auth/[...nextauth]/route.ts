import { handlers } from "@/lib/auth";

// NextAuth handles rate limiting internally via checkRateLimit in authorize()
export const { GET, POST } = handlers;
