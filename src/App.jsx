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

  useEffect(() => {
    // Handle initial page load and auth state
    const handleInitialLoad = () => {
      if (!loading) {
        if (!user) {
          // If not logged in, only allow home, login, or signup pages
          if (!['home', 'login', 'signup'].includes(currentPage)) {
            setCurrentPage('home');
          }
        } else {
          // If logged in, ensure we're not on auth pages
          if (['login', 'signup'].includes(currentPage)) {
            setCurrentPage('home');
          }
        }
      }
    };

    handleInitialLoad();
  }, [user, loading, currentPage]);

  const renderPage = () => {
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

  return (
    <div className="app">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="main-content">
        <NotesProvider>
          <WhiteboardProvider>
            <PlaygroundProvider>
              <CommunityProvider>
                {renderPage()}
              </CommunityProvider>
            </PlaygroundProvider>
          </WhiteboardProvider>
        </NotesProvider>
      </main>
    </div>
  );
}

export default App;