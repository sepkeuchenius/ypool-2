import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("logout", "routes/logout.tsx"),
  route("health", "routes/health.tsx"),
  route("registered", "routes/registered.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("profile", "routes/profile.tsx"),
  route("profile/:userId", "routes/profile.$userId.tsx"),
  route("claim-ghost", "routes/claim-ghost.tsx"),
  route("settings", "routes/settings.tsx"),
  route("api/users", "routes/api/api.users.tsx"),
  route("api/import", "routes/api/api.import.tsx"),
  route("newgame", "routes/newgame.tsx"),
  route("auth/microsoft", "routes/auth.microsoft.tsx"),
  route("auth/microsoft/callback", "routes/auth.microsoft.callback.tsx"),
] satisfies RouteConfig;
