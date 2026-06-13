import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Barbers } from './pages/Barbers';
import { BarberProfile } from './pages/BarberProfile';
import { ClientDashboard } from './pages/ClientDashboard';
import { BarberDashboard } from './pages/BarberDashboard';
import { BookingPage } from './pages/BookingPage';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/barbers" element={<Barbers />} />
          <Route path="/barbers/:id" element={<BarberProfile />} />

          {/* Cliente */}
          <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
            <Route path="/dashboard/client" element={<ClientDashboard />} />
            <Route path="/booking" element={<BookingPage />} />
          </Route>

          {/* Barbero */}
          <Route element={<ProtectedRoute allowedRoles={['BARBER']} />}>
            <Route path="/dashboard/barber" element={<BarberDashboard />} />
          </Route>

          {/* Admin (fase 6) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/dashboard/admin" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
