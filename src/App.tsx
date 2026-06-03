import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import AppShell from './components/layout/AppShell'

// Lazy-load/Import pages
import Login from './pages/auth/Login'
import Tasks from './pages/employee/Tasks'
import Training from './pages/employee/Training'
import Recipes from './pages/employee/Recipes'
import Hub from './pages/communication/Hub'
import Logbook from './pages/manager/Logbook'
import Builders from './pages/manager/Builders'
import Admin from './pages/admin/Admin'
import Reports from './pages/manager/Reports'

// Route shield for authenticated sessions
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div role="status" aria-label="Loading application session" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', border: '3.5px solid rgba(0,0,0,0.1)', borderTop: '3.5px solid #A855F7', animation: 'pb-spin .8s linear infinite' }} />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <AppShell>{children}</AppShell>
}

// Route shield for managers/super_users
const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isShiftLeader, loading } = useAuth()

  if (loading) return null

  if (!isShiftLeader) {
    return <Navigate to="/tasks" replace />
  }

  return <>{children}</>
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/tasks" element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            } />

            <Route path="/training" element={
              <ProtectedRoute>
                <Training />
              </ProtectedRoute>
            } />

            <Route path="/recipes" element={
              <ProtectedRoute>
                <Recipes />
              </ProtectedRoute>
            } />

            <Route path="/hub" element={
              <ProtectedRoute>
                <Hub />
              </ProtectedRoute>
            } />


            <Route path="/reports" element={
              <ProtectedRoute>
                <ManagerRoute>
                  <Reports />
                </ManagerRoute>
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={<Navigate to="/reports" replace />} />
            <Route path="/reviews" element={<Navigate to="/reports" replace />} />

            <Route path="/logbook" element={
              <ProtectedRoute>
                <Logbook />
              </ProtectedRoute>
            } />

            <Route path="/builders" element={
              <ProtectedRoute>
                <ManagerRoute>
                  <Builders />
                </ManagerRoute>
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />

            {/* Fallbacks */}
            <Route path="*" element={<Navigate to="/tasks" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
