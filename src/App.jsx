import { useState, useEffect } from 'react';
import { onAuthStateChange } from './firebase/auth';
import { useAuth } from './context/AuthContext';
import { NotesProvider } from './context/NotesContext';
import { WhiteboardProvider } from './context/WhiteboardContext';
import { PlaygroundProvider } from './context/PlaygroundContext';
import { CommunityProvider } from './context/CommunityContext';
import Navbar from './components/Navbar';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Notes from './pages/Notes';
import Quizzes from './pages/Quizzes';
import Whiteboard from './pages/Whiteboard';
import Community from './pages/Community';
import Playground from './pages/Playground/Playground';
import Chat from './components/Chat/Chat';
import Home from './pages/Home';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [authPage, setAuthPage] = useState('login');
  const { user, loading } = useAuth();

  console.log('App rendering with user:', user, 'loading:', loading);

  useEffect(() => {
    console.log('App useEffect - user:', user, 'loading:', loading);
    if (!loading && !user && window.location.pathname === '/') {
      console.log('Redirecting to auth page');
      window.location.href = '/auth';
    }
  }, [user, loading]);

  const renderPage = () => {
    console.log('Rendering page:', currentPage);
    switch (currentPage) {
      case 'home':
        return <Home setCurrentPage={setCurrentPage} />;
      case 'notes':
        return <Notes />;
      case 'quizzes':
        return <Quizzes />;
      case 'whiteboard':
        return <Whiteboard />;
      case 'community':
        return <Community />;
      case 'playground':
        return <Playground />;
      case 'chat':
        return <Chat />;
      case 'login':
        return <Login setCurrentPage={setCurrentPage} />;
      case 'signup':
        return <Signup setCurrentPage={setCurrentPage} />;
      default:
        return <Home setCurrentPage={setCurrentPage} />;
    }
  };

  if (loading) {
    console.log('Showing loading state');
    return <div className="loading">Loading...</div>;
  }

  console.log('Rendering main app with user:', user);

  return (
    <WhiteboardProvider>
      <NotesProvider>
        <PlaygroundProvider>
          <CommunityProvider>
            <div className="app">
              {user && (
                <>
                  <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
                  <main className="main-content">
                    {renderPage()}
                  </main>
                </>
              )}
              {!user && (
                <div className="auth-container">
                  {authPage === 'login' ? (
                    <Login setCurrentPage={setAuthPage} />
                  ) : (
                    <Signup setCurrentPage={setAuthPage} />
                  )}
                </div>
              )}
            </div>
          </CommunityProvider>
        </PlaygroundProvider>
      </NotesProvider>
    </WhiteboardProvider>
  );
}

export default App;