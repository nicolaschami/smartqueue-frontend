import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  // Check persistent storage first (Remember me), then session storage
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

  if (!token) {
    // User is not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Render the protected route content
  return <Outlet />;
}

export default ProtectedRoute;