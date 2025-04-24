import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotesProvider } from './context/NotesContext';
import { WhiteboardProvider } from './context/WhiteboardContext';
import { PlaygroundProvider } from './context/PlaygroundContext';
import { CommunityProvider } from './context/CommunityContext';
import './index.css';

// Initialize Monaco Editor
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <NotesProvider>
        <WhiteboardProvider>
          <PlaygroundProvider>
            <CommunityProvider>
              <App />
            </CommunityProvider>
          </PlaygroundProvider>
        </WhiteboardProvider>
      </NotesProvider>
    </AuthProvider>
  </React.StrictMode>
);
