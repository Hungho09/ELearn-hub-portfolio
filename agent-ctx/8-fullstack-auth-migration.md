# Task 8: Migrate Frontend from NextAuth to Custom JWT Auth Context

## Agent: full-stack-developer subagent

## Summary
Migrated the LearnHub frontend from NextAuth.js (session-based) authentication to a custom JWT-based auth context that communicates with the Python FastAPI backend on port 8001 via the Caddy gateway pattern.

## Files Created
- `src/lib/api.ts` - API helper with gateway routing (`?XTransformPort=8001`) and Bearer token attachment
- `src/lib/auth-context.tsx` - Custom React context with `useReducer` for JWT auth state management

## Files Modified
- `src/app/layout.tsx` - Replaced `SessionProvider` with `AuthProvider`
- `src/app/(auth)/login/page.tsx` - Replaced `signIn('credentials')` with `authContext.login()`
- `src/app/(auth)/register/page.tsx` - Replaced `fetch+signIn` with `authContext.register()`
- `src/app/(auth)/profile/page.tsx` - Replaced `useSession` with `useAuth`
- `src/components/auth/ProfileForm.tsx` - Replaced NextAuth hooks with custom auth context methods
- `src/components/home/Sidebar.tsx` - Replaced `useSession/signOut` with `useAuth`
- `src/components/home/ProfileCard.tsx` - Replaced `useSession` with `useAuth`
- `src/app/english/page.tsx` - Replaced `useSession` with `useAuth`

## Key Design Decisions
1. **useReducer over useState** - Avoids ESLint rule violation about calling setState within effects
2. **tokenRef** - Maintains a ref to the current token to avoid stale closures in callbacks (logout, updateProfile, uploadAvatar)
3. **localStorage persistence** - JWT token stored under `learnhub_token` key, validated on mount via `GET /api/auth/me`
4. **Gateway pattern** - All API requests use `?XTransformPort=8001` via the `apiFetch` helper, never `http://localhost:8001` directly

## Verification
- ESLint passes with zero errors
- All pages return HTTP 200: /, /login, /register, /profile, /english
- Old NextAuth API routes left intact (task 9 will remove them)
