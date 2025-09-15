// Main authentication components
export { AuthProviderWrapper as AuthProvider } from './auth-provider'
export { ProtectedRoute, RequireAuth, RequireVerified, RequireProfile, withAuth, useAuthRequirements } from './protected-route'
export { RouteGuard, PublicRoute, AuthRoute, VerifiedRoute, CompleteRoute } from './route-guard'
export { AuthMiddleware, AuthGate, useRouteProtection, withRouteProtection } from './auth-middleware'

// Authentication state indicators and UI
export { AuthStatusIndicator, ConnectionStatusIndicator, SessionWarning } from './auth-status-indicator'
export { AuthLoadingSkeleton, ProfileLoadingSkeleton, NavigationLoadingSkeleton, PageLoadingSkeleton } from './auth-loading-skeleton'
export { AuthStateProvider } from './auth-state-provider'
export { AuthPreferences } from './auth-preferences'
export { SessionStatus } from './session-status'

// Re-export auth dialog for convenience
export { AuthDialog } from '../auth-dialog'

// Types
export type { ProtectedRouteProps } from './protected-route'

