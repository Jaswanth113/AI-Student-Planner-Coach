import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import AuthPage from './pages/Auth';
import DashboardPage from './pages/Dashboard';
import TasksPage from './pages/Tasks';
import PlannerPage from './pages/Planner';
import ExpensesPage from './pages/Expenses';
import CommitmentsPage from './pages/Commitments';
import GroceryPage from './pages/Grocery'; // Import GroceryPage
import { GroceryProvider } from './pages/Grocery'; // Import GroceryProvider
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import NotFoundPage from './pages/NotFound';
import AIAssistantPage from './pages/AIAssistant';
import SettingsPage from './pages/Settings';
import { Profile } from './pages/Profile';
import NotificationsPage from './pages/Notifications';
import LearnPage from './pages/Learn'; // Import LearnPage

import { TooltipProvider } from '@/components/ui/tooltip'; // Re-import TooltipProvider

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <TooltipProvider> {/* Re-wrap the entire application with TooltipProvider here */}
            <Routes>
              {/* Authentication Routes */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Outlet />
                    </AppLayout>
                  </ProtectedRoute>
                }
              >
              <Route index element={<DashboardPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="commitments" element={<CommitmentsPage />} />
              {/* Grocery Page Route - Wrapped with GroceryProvider */}
              <Route
                path="grocery"
                element={
                  <GroceryProvider> {/* Wrap only GroceryPage with its provider */}
                    <GroceryPage />
                  </GroceryProvider>
                }
              />
              <Route path="ai-assistant" element={<AIAssistantPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="learn" element={<LearnPage />} /> {/* Add the new Learn page route */}
            </Route>

            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </TooltipProvider>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
