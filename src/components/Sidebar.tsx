import React from "react";
import { Nav, Button, OverlayTrigger, Tooltip, Dropdown } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import {
  LayoutDashboard,
  Users,
  Layers,
  UserCircle,
  Gavel,
  CreditCard,
  BarChart3,
  LogOut,
  ChevronLeft,
  Menu,
  UserPlus,
  Hexagon,
  Bell,
  Languages
} from "lucide-react";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const role = localStorage.getItem("userRole") ?? "User";
  const userName =
    JSON.parse(localStorage.getItem("user") || "{}").firstName || "User";

  if (["/login", "/change-password"].includes(location.pathname)) {
    return null;
  }

  const hasAccess = (...roles: string[]) => roles.includes(role);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const renderTooltip = (text: string, props: any) =>
    !isOpen ? (
      <Tooltip id={`tooltip-${text}`} {...props}>
        {text}
      </Tooltip>
    ) : (
      <></>
    );

  interface NavItemProps {
    to?: string;
    icon: React.ElementType;
    text: string;
    onClick?: () => void;
    className?: string;
    requiredRoles?: string[];
  }

  const NavItem: React.FC<NavItemProps> = ({
    to,
    icon: Icon,
    text,
    onClick,
    className,
    requiredRoles
  }) => {
    if (requiredRoles && !hasAccess(...requiredRoles)) return null;
    const isActive = to ? location.pathname === to : false;

    const content = (
      <>
        <div className="icon-wrapper">
          <Icon size={20} />
        </div>
        <span className="link-text">{text}</span>
      </>
    );

    const commonProps = {
      className: `nav-link-custom ${isActive ? "active" : ""} ${
        className || ""
      }`,
      onClick: onClick
    };

    let linkComponent = to ? (
      <Nav.Link as={Link} to={to} {...commonProps}>
        {content}
      </Nav.Link>
    ) : (
      <div {...commonProps} style={{ cursor: "pointer" }}>
        {content}
      </div>
    );

    if (isOpen) return linkComponent;

    return (
      <OverlayTrigger
        placement="right"
        overlay={(props) => renderTooltip(text, props)}
      >
        <div className="w-100">{linkComponent}</div>
      </OverlayTrigger>
    );
  };

  return (
    <>
       {/* 🌐 Language Dropdown — Top Right */}
    <LanguageSwitcher />


      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="brand-container">
            <div className="brand-icon">
              <Hexagon size={28} strokeWidth={2.5} />
            </div>
            <div className="brand-text">
              <h5 className="mb-0 fw-bold">{t("sidebar.brand")}</h5>
              <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                {t("sidebar.management")}
              </small>
            </div>
          </div>
          <Button variant="link" className="toggle-btn" onClick={toggle}>
            {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        <div className="sidebar-content">
          <Nav className="flex-column gap-1">
            {role === "Member" ? (
              <>
                {isOpen && (
                  <div className="nav-section-label">
                    {t("sidebar.personal")}
                  </div>
                )}
                <NavItem
                  to="/MemberProfile"
                  icon={UserCircle}
                  text={t("sidebar.myProfile")}
                />
                <NavItem
                  to="/JoinGroupPage"
                  icon={Layers}
                  text={t("sidebar.joinGroups")}
                />
                <NavItem
                  to="/NotificationSettings"
                  icon={Bell}
                  text={t("sidebar.notifications")}
                />
                {isOpen && (
                  <div className="nav-section-label mt-2">
                    {t("sidebar.finance")}
                  </div>
                )}
                <NavItem
                  to="/auctions"
                  icon={Gavel}
                  text={t("sidebar.auctions")}
                />
              </>
            ) : (
              <>
                <NavItem
                  to="/"
                  icon={LayoutDashboard}
                  text={t("sidebar.dashboard")}
                  requiredRoles={["Admin", "Agent"]}
                />
                {(hasAccess("Admin") || hasAccess("Agent")) &&
                  isOpen && (
                    <div className="nav-section-label">
                      {t("sidebar.management")}
                    </div>
                  )}
                <NavItem
                  to="/users"
                  icon={Users}
                  text={t("sidebar.users")}
                  requiredRoles={["Admin"]}
                />
                <NavItem
                  to="/members"
                  icon={UserPlus}
                  text={t("sidebar.groups")}
                  requiredRoles={["Admin", "Agent"]}
                />
                {(hasAccess("Admin") || hasAccess("Agent")) &&
                  isOpen && (
                    <div className="nav-section-label mt-2">
                      {t("sidebar.finance")}
                    </div>
                  )}
                <NavItem
                  to="/auctions"
                  icon={Gavel}
                  text={t("sidebar.auctions")}
                  requiredRoles={["Admin", "Agent"]}
                />
                <NavItem
                  to="/payments"
                  icon={CreditCard}
                  text={t("sidebar.payments")}
                  requiredRoles={["Admin", "Agent"]}
                />
                <NavItem
                  to="/NotificationTemplates"
                  icon={UserPlus}
                  text={t("sidebar.templates")}
                  requiredRoles={["Admin", "Agent"]}
                />
                <NavItem
                  to="/reports"
                  icon={BarChart3}
                  text={t("sidebar.reports")}
                  requiredRoles={["Admin", "Agent"]}
                />
              </>
            )}
          </Nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="fw-bold d-block">{userName}</span>
              <span className="small text-muted">{role}</span>
            </div>
          </div>
          <NavItem
            onClick={handleLogout}
            icon={LogOut}
            text={t("sidebar.logout")}
            className="logout-item"
          />
        </div>
      </div>
    </>
  );
};

export default Sidebar;