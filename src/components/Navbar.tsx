import React from 'react';
import { Navbar, Nav, Container, NavDropdown, Dropdown } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import i18n hooks
import { Languages } from 'lucide-react'; // Import icon

const CustomNavbar: React.FC = () => {
  const { t, i18n } = useTranslation(); // Initialize translation
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem("userRole");

  // Global language switcher function
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    navigate("/login", {
      state: { loggedOutMessage: t('login.logoutSuccess') } // Use translated message
    });
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/">{t('navbar.brand')}</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className={location.pathname === "/" ? "active" : ""}>
              {t('navbar.dashboard')}
            </Nav.Link>
            {/* ... Other translated Nav.Links (Users, Members, etc.) ... */}
          </Nav>

          <Nav className="align-items-center">
            {/* --- GLOBAL LANGUAGE SELECTOR --- */}
            <Dropdown className="me-3">
              <Dropdown.Toggle variant="outline-light" size="sm" className="d-flex align-items-center border-0">
                <Languages size={16} className="me-2" />
                {i18n.language.toUpperCase()}
              </Dropdown.Toggle>
              <Dropdown.Menu align="end">
                <Dropdown.Item onClick={() => changeLanguage('en')}>English</Dropdown.Item>
                <Dropdown.Item onClick={() => changeLanguage('te')}>తెలుగు</Dropdown.Item>
                <Dropdown.Item onClick={() => changeLanguage('hi')}>हिन्दी</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            <NavDropdown title={role || t('navbar.userDefault')}>
              <NavDropdown.Item onClick={handleLogout}>{t('navbar.logout')}</NavDropdown.Item>
            </NavDropdown>
          </Nav>

        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default CustomNavbar;