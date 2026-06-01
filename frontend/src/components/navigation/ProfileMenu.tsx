import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCircleUser, FaUser, FaArrowRightFromBracket, FaArrowRightToBracket, FaUserPlus } from 'react-icons/fa6';
import { useClickOutside } from '../../hooks/useClickOutside';
import styles from './styles/ProfileMenu.module.css';
import navStyles from './styles/NavigationControls.module.css';

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
  const handleOutsideClick = useCallback(() => {
    setOpen(false);
  }, []);

  useClickOutside({
    ref,
    enabled: open,
    onOutsideClick: handleOutsideClick,
  });

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

  const handleProfile = () => {
    onProfile();
    setOpen(false);
  };

  return (
    <div className={styles.root} ref={ref}>
      <button
        className={navStyles.iconButton}
        type="button"
        aria-label="User profile"
        onClick={() => setOpen((v) => !v)}
      >
        <FaCircleUser />
      </button>
      {open && (
        <div className={styles.dropdown}>
          <ul className={styles.list}>
            {isAuthenticated ? (
              <>
                <li className={styles.listItem}>
                  <button type="button" onClick={handleProfile} className={styles.menuButton}>
                    <FaUser className={styles.icon} />
                    <span>{userName ? userName : 'הפרופיל שלי'}</span>
                  </button>
                </li>
                <li className={styles.listItem}>
                  <button type="button" onClick={handleLogout} className={styles.menuButton}>
                    <FaArrowRightFromBracket className={styles.icon} />
                    <span>התנתקות</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className={styles.listItem}>
                  <button type="button" onClick={handleLogin} className={styles.menuButton}>
                    <FaArrowRightToBracket className={styles.icon} />
                    <span>התחברות</span>
                  </button>
                </li>
                <li className={styles.listItem}>
                  <button type="button" onClick={handleRegister} className={styles.menuButton}>
                    <FaUserPlus className={styles.icon} />
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
