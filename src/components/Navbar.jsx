import { useState, useEffect, useRef } from 'react';
import { logout } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import { getDocuments } from '../firebase/firestore';
import './Navbar.css';

const ProfileDropdown = ({ user, onLogout, onToggleTheme, isDarkMode }) => {
  // Create a separate handler for the toggle switch to prevent event bubbling
  const handleToggleChange = (e) => {
    e.stopPropagation(); // Prevent the container click from firing
    onToggleTheme();
  };

  return (
    <div className="profile-dropdown">
      <div className="profile-header">
        {user.photoURL ? (
          <img 
            src={user.photoURL} 
            alt={user.displayName || 'User'} 
            className="profile-picture-large"
          />
        ) : (
          <div className="profile-initials-large">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
        <div className="profile-info">
          <h3>{user.displayName || 'User'}</h3>
          <p>{user.email}</p>
        </div>
      </div>
      
      {user.bio && (
        <div className="profile-bio">
          {user.bio}
        </div>
      )}
      
      <div className="profile-actions">
        <div className="theme-toggle-container">
          <div className="theme-toggle-label">
            <span className="theme-icon">{isDarkMode ? '🌙' : '🌙'}</span>
            <span>{isDarkMode ? 'Dark Mode' : 'Dark Mode'}</span>
          </div>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={isDarkMode} 
              onChange={handleToggleChange}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Handle click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    // Use mousedown instead of click to catch the event before blur
    document.addEventListener('mousedown', handleClickOutside);
    
    // Also add a click handler to the document to ensure we catch all clicks
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Close dropdown when navigating to a new page
  useEffect(() => {
    setShowProfileDropdown(false);
  }, [currentPage]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          console.log('User auth data:', user);
          
          // Use the user's auth data directly
          const userProfileData = {
            uid: user.uid,
            displayName: user.displayName || 'User',
            email: user.email,
            photoURL: user.photoURL,
            createdAt: new Date()
          };
          
          console.log('Using auth data for profile:', userProfileData);
          setUserProfile(userProfileData);
          
          // Try to fetch from Firestore as a backup
          try {
            const users = await getDocuments('users', {
              where: ['uid', '==', user.uid]
            });
            if (users.length > 0) {
              console.log('User profile found in Firestore:', users[0]);
              setUserProfile({
                ...users[0],
                displayName: user.displayName || users[0].displayName || 'User',
                email: user.email || users[0].email,
                photoURL: user.photoURL || users[0].photoURL
              });
            }
          } catch (firestoreError) {
            console.warn('Could not fetch from Firestore:', firestoreError);
          }
        } catch (error) {
          console.error('Error setting up user profile:', error);
          setUserProfile({
            uid: user.uid,
            displayName: user.displayName || 'User',
            email: user.email,
            photoURL: user.photoURL
          });
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
      setShowProfileDropdown(false);
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

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const toggleProfileDropdown = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setShowProfileDropdown(!showProfileDropdown);
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
              <div 
                className="profile-trigger" 
                onClick={toggleProfileDropdown}
                aria-expanded={showProfileDropdown}
                aria-haspopup="true"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    className="profile-picture"
                  />
                ) : (
                  <div className="profile-initials">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              
              {showProfileDropdown && (
                <ProfileDropdown 
                  user={user}
                  onLogout={handleLogout}
                  onToggleTheme={toggleTheme}
                  isDarkMode={isDarkMode}
                />
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