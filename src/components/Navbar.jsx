import { useState, useEffect, useRef } from 'react';
import { logout } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import { getDocuments } from '../firebase/firestore';
import './Navbar.css';

const Navbar = ({ currentPage, setCurrentPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const { user } = useAuth();
  const profileRef = useRef(null);

  // Handle click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const users = await getDocuments('users', {
            where: ['uid', '==', user.uid]
          });
          if (users.length > 0) {
            setUserProfile(users[0]);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserName = () => {
    return userProfile?.username || user?.displayName || 'User';
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsProfileOpen(false);
      setCurrentPage('home');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handlePageChange = (pageId) => {
    setCurrentPage(pageId);
    setIsMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: '' },
    { id: 'notes', label: 'Notes', icon: '' },
    { id: 'quizzes', label: 'Quizzes', icon: '' },
    { id: 'whiteboard', label: 'Whiteboard', icon: '' },
    { id: 'community', label: 'Community', icon: '' },
    { id: 'playground', label: 'Playground', icon: '' },
    { id: 'chat', label: 'Chat', icon: '' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <div className="navbar-brand" onClick={() => handlePageChange('home')}>
            <h1>ThinkBoard</h1>
          </div>
          {user && (
            <div className="desktop-nav">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => handlePageChange(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="navbar-right">
          {user ? (
            <div className="profile-container" ref={profileRef}>
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt="Profile"
                  className="profile-picture"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                />
              ) : (
                <div
                  className="profile-initials"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  {getInitials(getUserName())}
                </div>
              )}
              
              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-header">
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt="Profile"
                        className="profile-picture-large"
                      />
                    ) : (
                      <div className="profile-initials-large">
                        {getInitials(getUserName())}
                      </div>
                    )}
                    <div className="profile-info">
                      <h3>{getUserName()}</h3>
                      <p>{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="profile-bio">
                    {userProfile?.bio || 'No bio available'}
                  </div>
                  
                  <div className="profile-actions">
                    <button
                      className="theme-toggle-button"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                      <span className="theme-icon">
                        {isDarkMode ? '☀️' : '🌙'}
                      </span>
                      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    
                    <button
                      className="logout-button"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="login-button"
                onClick={() => handlePageChange('login')}
              >
                Login
              </button>
              <button 
                className="signup-button"
                onClick={() => handlePageChange('signup')}
              >
                Signup
              </button>
            </div>
          )}
          <button className="menu-toggle" onClick={toggleMenu}>
            <span className="menu-icon">☰</span>
          </button>
        </div>
      </div>

      {user && (
        <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
          <div className="mobile-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handlePageChange(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 