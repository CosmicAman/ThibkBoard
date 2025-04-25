import { createContext, useContext, useState, useEffect } from 'react';
import { addDocument, getDocument, updateDocument, getDocuments, deleteDocument } from '../firebase/firestore';
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
    
    const loadUserWhiteboards = async (userId) => {
      try {
        setIsLoading(true);
        setError(null);
        
        const userWhiteboards = await getDocuments('whiteboards', [
          ['userId', '==', userId]
        ]);
        
        if (userWhiteboards.length === 0) {
          // Create a new whiteboard if user has none
          const newWhiteboard = {
            userId,
            title: 'My First Whiteboard',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const newWhiteboardId = await addDocument('whiteboards', newWhiteboard);
          const createdWhiteboard = {
            id: newWhiteboardId,
            ...newWhiteboard
          };
          
          setWhiteboards([createdWhiteboard]);
          setCurrentWhiteboard(createdWhiteboard);
        } else {
          setWhiteboards(userWhiteboards);
          setCurrentWhiteboard(userWhiteboards[0]);
        }
      } catch (error) {
        console.error('Error loading whiteboards:', error);
        setError('Failed to load whiteboards: ' + error.message);
        setWhiteboards([]);
        setCurrentWhiteboard(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load whiteboards if user is authenticated
    if (user) {
      loadUserWhiteboards(user.uid);
    } else {
      // Reset state when user is not authenticated
      setWhiteboards([]);
      setCurrentWhiteboard(null);
      setIsLoading(false);
    }
  }, [user]);

  const saveWhiteboard = async (userId, whiteboardData) => {
    try {
      console.log('Saving whiteboard:', whiteboardData);
      setIsLoading(true);
      setError(null);

      // Check if user is authenticated
      if (!user) {
        throw new Error('User must be authenticated to save whiteboards');
      }

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

      // Check if user is authenticated
      if (!user) {
        throw new Error('User must be authenticated to load whiteboards');
      }

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
      
      // Check if user is authenticated
      if (!user) {
        throw new Error('User must be authenticated to update whiteboards');
      }
      
      // Update the whiteboard in Firestore
      await updateDocument('whiteboards', whiteboardId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      // Update the local state
      setWhiteboards(prevWhiteboards => 
        prevWhiteboards.map(wb => 
          wb.id === whiteboardId 
            ? { ...wb, ...updates, updatedAt: new Date().toISOString() }
            : wb
        )
      );
      
      // Update current whiteboard if it's the one being edited
      if (currentWhiteboard?.id === whiteboardId) {
        setCurrentWhiteboard(prev => ({
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error updating whiteboard:', error);
      setError('Failed to update whiteboard: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWhiteboard = async (whiteboardId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!user) {
        throw new Error('User must be authenticated to delete whiteboards');
      }
      
      // Delete the whiteboard from Firestore
      await deleteDocument('whiteboards', whiteboardId);
      
      // Update the local state
      setWhiteboards(prevWhiteboards => 
        prevWhiteboards.filter(wb => wb.id !== whiteboardId)
      );
      
      // If the deleted whiteboard was the current one, set a new current whiteboard
      if (currentWhiteboard?.id === whiteboardId) {
        const remainingWhiteboards = whiteboards.filter(wb => wb.id !== whiteboardId);
        if (remainingWhiteboards.length > 0) {
          setCurrentWhiteboard(remainingWhiteboards[0]);
        } else {
          setCurrentWhiteboard(null);
        }
      }
    } catch (error) {
      console.error('Error deleting whiteboard:', error);
      setError('Failed to delete whiteboard: ' + error.message);
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
    updateWhiteboard,
    deleteWhiteboard
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