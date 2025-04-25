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
              <div 
                className="profile-picture-container"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.displayName}
                    className="profile-picture"
                    onError={(e) => {
                      console.error('Error loading profile picture:', e);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="profile-initials"
                  style={{ display: userProfile?.photoURL ? 'none' : 'flex' }}
                >
                  {getInitials(userProfile?.displayName)}
                </div>
              </div>
              
              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-header">
                    <div className="profile-picture-container-large">
                      {userProfile?.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt={userProfile.displayName}
                          className="profile-picture-large"
                          onError={(e) => {
                            console.error('Error loading large profile picture:', e);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="profile-initials-large"
                        style={{ display: userProfile?.photoURL ? 'none' : 'flex' }}
                      >
                        {getInitials(userProfile?.displayName)}
                      </div>
                    </div>
                    <div className="profile-info">
                      <h3>{userProfile?.displayName}</h3>
                      <p>{userProfile?.email}</p>
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