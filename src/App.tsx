import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import CreateBusiness from './pages/Createbusiness';
import QueueBoard from './pages/Queueboard';
import JoinQueue from './pages/JoinQueue';
import DisplayQueue from './pages/Queuedisplay';
import ClientInfo, { type Business, type Queue } from './pages/Clientinfo';

interface LoginPayload {
  business: Business;
  queues: Queue[];
  token?: string;
}

// Route Protection Guard Component
function ProtectedRoute() {
  const token = localStorage.getItem('authToken');

  if (!token) {
    // User is not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // Render the child routes if authenticated
  return <Outlet />;
}

// Wraps Login so it can navigate on success and persist session data
function LoginRoute() {
  const navigate = useNavigate();

  return (
    <Login
      onCreateBusiness={() => navigate('/create-business')}
      onLoginSuccess={(data) => {
        const payload = data as unknown as LoginPayload;
        
        // Save auth token or session indicator to localStorage
        const tokenToStore = payload.token || 'authenticated';
        localStorage.setItem('authToken', tokenToStore);

        // Store payload in localStorage as fallback in case user reloads /client-info
        if (payload.business) {
          localStorage.setItem('sq_client_payload', JSON.stringify(payload));
        }

        navigate('/client-info', { state: payload });
      }}
    />
  );
}

// Wraps ClientInfo so it can read state from navigation or localStorage
function ClientInfoRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve state from navigation location or fallback to localStorage
  const statePayload = location.state as LoginPayload | null;
  const storedPayloadRaw = localStorage.getItem('sq_client_payload');
  const storedPayload = storedPayloadRaw ? (JSON.parse(storedPayloadRaw) as LoginPayload) : null;

  const payload = statePayload?.business ? statePayload : storedPayload;

  // If no payload is available at all, redirect to login
  if (!payload?.business) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ClientInfo
      business={payload.business}
      queues={payload.queues || []}
      onOpenDashboard={(queueId) => navigate(`/dashboard/${queueId}`)}
      joinPath="/displayQueue"
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/create-business" element={<CreateBusiness onCancel={() => window.location.assign('/login')} />} />

        {/* Restricted / Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/client-info" element={<ClientInfoRoute />} />
          <Route path="/dashboard/:queueId" element={<QueueBoard />} />
          <Route path="/joinQueue" element={<JoinQueue />} />
          <Route path="/displayQueue" element={<DisplayQueue />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;