import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthInitializer } from './components/AuthInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Barbers } from './pages/Barbers';
import { BarberProfile } from './pages/BarberProfile';
import { BookingPage } from './pages/BookingPage';
import { ClientDashboard } from './pages/ClientDashboard';
import { BarberDashboard } from './pages/BarberDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { NotFound } from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors theme="dark" position="top-right" />
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/barbers" element={<Barbers />} />
            <Route path="/barbers/:id" element={<BarberProfile />} />
            <Route path="/booking" element={<BookingPage />} />

            {/* Cliente */}
            <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
              <Route path="/dashboard/client" element={<ClientDashboard />} />
            </Route>

            {/* Barbero */}
            <Route element={<ProtectedRoute allowedRoles={['BARBER']} />}>
              <Route path="/dashboard/barber" element={<BarberDashboard />} />
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
            </Route>

            {/* Perfil propio (cualquier rol autenticado) */}
            <Route element={<ProtectedRoute allowedRoles={['CLIENT', 'BARBER', 'ADMIN']} />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
