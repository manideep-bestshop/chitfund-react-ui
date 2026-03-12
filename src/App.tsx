import React, { JSX, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import ChitGroups from './pages/ChitGroups';
import Members from './pages/Members';
import Payments from './pages/Payments';
import Auctions from './pages/Auctions';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Sidebar from "./components/Sidebar";
import MemberProfile from "./pages/MemberProfile";
import JoinGroupPage from "./pages/JoinGroupPage";
import AdminRequestsPage from "./pages/AdminRequestsPage";
import NotificationSettings from "./pages/NotificationSettings";
import NotificationTemplates from "./pages/NotificationTemplates";

// ... (Keep your ProtectedRoute and RoleProtectedRoute components exactly as they were) ...
const ProtectedRoute = ({ element }: { element: JSX.Element }) => {
  const token = localStorage.getItem("jwtToken");
  const user = localStorage.getItem("user");
  if (!token || !user) return <Navigate to="/login" replace />;
  return element;
};

const RoleProtectedRoute = ({ element, allowedRoles }: { element: JSX.Element; allowedRoles: string[] }) => {
  const token = localStorage.getItem("jwtToken");
  const role = localStorage.getItem("userRole");
  const user = localStorage.getItem("user");

  if (!token || !user) return <Navigate to="/login" replace />;
  const parsedUser = JSON.parse(user);
  if (parsedUser.forcePasswordChange) return <Navigate to="/change-password" replace />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return element;
};

function App() {
  // 1. State for Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 2. Toggle Function
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // 3. Extract the User ID from localStorage
  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userId = currentUser?.userId || ""; // Fallback to empty string if not logged in

  return (
    <Router>
      {/* 3. Pass state and toggle function to Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />

      {/* 4. Adjust margin based on state with smooth transition */}
      <div style={{ 
        marginLeft: isSidebarOpen ? "240px" : "70px", 
        padding: "20px",
        transition: "margin-left 0.3s ease" 
      }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route
            path="/"
            element={<RoleProtectedRoute element={<Dashboard />} allowedRoles={["Admin", "Agent"]} />}
          />
          <Route
            path="/users"
            element={<RoleProtectedRoute element={<Users />} allowedRoles={["Admin"]} />}
          />
          <Route
            path="/NotificationTemplates"
            element={<RoleProtectedRoute element={<NotificationTemplates />} allowedRoles={["Admin"]} />}
          />
          <Route
            path="/chit-groups"
            element={<RoleProtectedRoute element={<ChitGroups />} allowedRoles={["Admin", "Agent"]} />}
          />
          <Route
            path="/MemberProfile"
            element={<RoleProtectedRoute element={<MemberProfile />} allowedRoles={["Member"]} />}
          />
          <Route
            path="/JoinGroupPage"
            element={<RoleProtectedRoute element={<JoinGroupPage />} allowedRoles={["Member"]} />}
          />
          <Route
            path="/AdminRequestsPage"
            element={<RoleProtectedRoute element={<AdminRequestsPage />} allowedRoles={["Admin", "Agent"]} />}
          />
          <Route
            path="/NotificationSettings"
            element={<RoleProtectedRoute element={<NotificationSettings userId={userId} />} allowedRoles={["Member"]} />}
          />
          <Route
            path="/members"
            element={<RoleProtectedRoute element={<Members />} allowedRoles={["Admin", "Agent"]} />}
          />
          <Route
            path="/payments"
            element={<RoleProtectedRoute element={<Payments />} allowedRoles={["Admin", "Agent"]} />}
          />
          <Route
            path="/auctions"
            element={<RoleProtectedRoute element={<Auctions />} allowedRoles={["Admin", "Agent", "Member"]} />}
          />
          <Route
            path="/reports"
            element={<RoleProtectedRoute element={<Reports />} allowedRoles={["Admin", "Agent"]} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;