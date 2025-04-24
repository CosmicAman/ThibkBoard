import { createContext, useContext, useState, useEffect } from 'react';
import { addDocument, getDocument, updateDocument, getDocuments } from '../firebase/firestore';
import { useAuth } from './AuthContext';

export const WHITEBOARD_TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle'
};

export const DEFAULT_WHITEBOARD_SETTINGS = {
  tool: WHITEBOARD_TOOLS.PEN,
  color: '#000000',
  strokeSize: 5
};

const WhiteboardContext = createContext();

export const WhiteboardProvider = ({ children }) => {
  const { user } = useAuth();
  const [whiteboards, setWhiteboards] = useState([]);
  const [currentWhiteboard, setCurrentWhiteboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('WhiteboardProvider rendering with user:', user);

  // Load user's whiteboards when authenticated
  useEffect(() => {
    console.log('WhiteboardProvider effect running');
    
    const loadUserWhiteboards = async () => {
      if (!user) {
        console.log('No user found, resetting state');
        setWhiteboards([]);
        setCurrentWhiteboard(null);
        setIsLoading(false);
        return;
      }

      try {
        console.log('Loading whiteboards for user:', user.uid);
        setIsLoading(true);
        setError(null);

        const userWhiteboards = await getDocuments('whiteboards', [
          { field: 'userId', operator: '==', value: user.uid }
        ]);

        console.log('Loaded whiteboards:', userWhiteboards);
        setWhiteboards(userWhiteboards);
        
        if (userWhiteboards.length > 0) {
          const mostRecent = userWhiteboards.reduce((prev, current) => 
            new Date(prev.updatedAt) > new Date(current.updatedAt) ? prev : current
          );
          console.log('Setting current whiteboard:', mostRecent);
          setCurrentWhiteboard(mostRecent);
        } else {
          console.log('No whiteboards found, creating new one');
          const newWhiteboard = {
            title: 'My Whiteboard',
            content: '',
            userId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          try {
            const docRef = await addDocument('whiteboards', newWhiteboard);
            console.log('Created new whiteboard with ID:', docRef.id);
            
            const savedWhiteboard = {
              id: docRef.id,
              ...newWhiteboard
            };
            
            setCurrentWhiteboard(savedWhiteboard);
            setWhiteboards([savedWhiteboard]);
          } catch (createError) {
            console.error('Error creating new whiteboard:', createError);
            setError('Failed to create new whiteboard: ' + createError.message);
          }
        }
      } catch (error) {
        console.error('Error loading whiteboards:', error);
        setError('Failed to load whiteboards: ' + error.message);
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    };

    loadUserWhiteboards();
  }, [user]);

  const saveWhiteboard = async (userId, whiteboardData) => {
    try {
      console.log('Saving whiteboard:', whiteboardData);
      setIsLoading(true);
      setError(null);

      const whiteboardWithUser = {
        ...whiteboardData,
        userId,
        createdAt: whiteboardData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDocument('whiteboards', whiteboardWithUser);
      
      if (!docRef || !docRef.id) {
        throw new Error('Failed to create whiteboard document');
      }

      const savedWhiteboard = {
        id: docRef.id,
        ...whiteboardWithUser
      };

      setWhiteboards(prev => [...prev, savedWhiteboard]);
      setCurrentWhiteboard(savedWhiteboard);

      console.log('Whiteboard saved successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving whiteboard:', error);
      setError('Failed to save whiteboard: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhiteboard = async (whiteboardId) => {
    try {
      setIsLoading(true);
      setError(null);

      const whiteboard = await getDocument('whiteboards', whiteboardId);
      
      if (!whiteboard) {
        throw new Error('Whiteboard not found');
      }

      setCurrentWhiteboard(whiteboard);
      return whiteboard;
    } catch (error) {
      console.error('Error loading whiteboard:', error);
      setError('Failed to load whiteboard: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateWhiteboard = async (whiteboardId, updates) => {
    try {
      setIsLoading(true);
      setError(null);

      await updateDocument('whiteboards', whiteboardId, updates);
      
      const updatedWhiteboard = {
        ...currentWhiteboard,
        ...updates
      };

      setCurrentWhiteboard(updatedWhiteboard);
      setWhiteboards(prev => 
        prev.map(wb => wb.id === whiteboardId ? updatedWhiteboard : wb)
      );
    } catch (error) {
      console.error('Error updating whiteboard:', error);
      setError('Failed to update whiteboard: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    whiteboards,
    currentWhiteboard,
    isLoading,
    error,
    saveWhiteboard,
    loadWhiteboard,
    updateWhiteboard
  };

  console.log('WhiteboardProvider value:', value);

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  );
};

export const useWhiteboard = () => {
  const context = useContext(WhiteboardContext);
  if (!context) {
    throw new Error('useWhiteboard must be used within a WhiteboardProvider');
  }
  return context;
}; 