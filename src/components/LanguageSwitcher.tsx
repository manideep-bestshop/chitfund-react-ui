import React from "react";
import { Dropdown } from "react-bootstrap";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "15px",
        right: "20px",
        zIndex: 1050
      }}
    >
      <Dropdown align="end">
        <Dropdown.Toggle
          variant="light"
          size="sm"
          className="shadow-sm d-flex align-items-center"
        >
          <Languages size={16} className="me-2" />
          Language ({i18n.language.toUpperCase()})
        </Dropdown.Toggle>

        <Dropdown.Menu>
          <Dropdown.Item onClick={() => changeLanguage("en")}>
            English
          </Dropdown.Item>
          <Dropdown.Item onClick={() => changeLanguage("te")}>
            తెలుగు
          </Dropdown.Item>
          <Dropdown.Item onClick={() => changeLanguage("hi")}>
            हिन्दी
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default LanguageSwitcher;