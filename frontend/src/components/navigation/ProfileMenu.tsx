import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCircleUser, FaUser, FaArrowRightFromBracket, FaArrowRightToBracket, FaUserPlus } from 'react-icons/fa6';

export type ProfileMenuProps = {
  isAuthenticated: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  onProfile: () => void;
  userName?: string;
};

export function ProfileMenu({
  isAuthenticated,
  onLogin,
  onRegister,
  onLogout,
  onProfile,
  userName,
}: ProfileMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogin = () => {
    onLogin();
    setOpen(false);
    navigate('/login');
  };

  const handleRegister = () => {
    onRegister();
    setOpen(false);
    navigate('/register');
  };

  const handleLogout = () => {
    onLogout();
    setOpen(false);
    navigate('/login');
  };

  return (
    <div className="profile-menu" ref={ref}>
      <button
        className="nav-icon-btn"
        type="button"
        aria-label="User profile"
        onClick={() => setOpen((v) => !v)}
      >
        <FaCircleUser />
      </button>
      {open && (
        <div className="profile-menu__dropdown">
          <ul>
            {isAuthenticated ? (
              <>
                <li>
                  <button type="button" onClick={onProfile}>
                    <FaUser className="profile-menu__icon" />
                    <span>{userName ? userName : 'הפרופיל שלי'}</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={handleLogout}>
                    <FaArrowRightFromBracket className="profile-menu__icon" />
                    <span>התנתקות</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <button type="button" onClick={handleLogin}>
                    <FaArrowRightToBracket className="profile-menu__icon" />
                    <span>התחברות</span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={handleRegister}>
                    <FaUserPlus className="profile-menu__icon" />
                    <span>הרשמה</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
