import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  
  // Add cache refs to reduce database reads
  const whiteboardsCacheRef = useRef({});
  const lastFetchTimeRef = useRef(null);
  const pendingUpdatesRef = useRef([]);
  const updateTimeoutRef = useRef(null);

  console.log('WhiteboardProvider rendering with user:', user);

  // Load user's whiteboards when authenticated
  useEffect(() => {
    console.log('WhiteboardProvider effect running');
    
    const loadUserWhiteboards = async (userId) => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if we have a recent cache (less than 5 minutes old)
        const now = Date.now();
        if (whiteboardsCacheRef.current[userId] && lastFetchTimeRef.current && 
            (now - lastFetchTimeRef.current) < 300000) { // 5 minutes
          console.log('Using cached whiteboards');
          setWhiteboards(whiteboardsCacheRef.current[userId]);
          setCurrentWhiteboard(whiteboardsCacheRef.current[userId][0]);
          setIsLoading(false);
          return;
        }
        
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
          
          // Update cache
          whiteboardsCacheRef.current[userId] = [createdWhiteboard];
          lastFetchTimeRef.current = now;
          
          setWhiteboards([createdWhiteboard]);
          setCurrentWhiteboard(createdWhiteboard);
        } else {
          // Update cache
          whiteboardsCacheRef.current[userId] = userWhiteboards;
          lastFetchTimeRef.current = now;
          
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

  // Process pending updates in batches
  const processPendingUpdates = async () => {
    if (pendingUpdatesRef.current.length === 0) return;
    
    try {
      console.log(`Processing ${pendingUpdatesRef.current.length} pending updates`);
      
      // Group updates by whiteboard ID
      const updatesByWhiteboard = {};
      pendingUpdatesRef.current.forEach(update => {
        if (!updatesByWhiteboard[update.whiteboardId]) {
          updatesByWhiteboard[update.whiteboardId] = {};
        }
        updatesByWhiteboard[update.whiteboardId] = {
          ...updatesByWhiteboard[update.whiteboardId],
          ...update.updates
        };
      });
      
      // Process each whiteboard's updates
      for (const [whiteboardId, updates] of Object.entries(updatesByWhiteboard)) {
        await updateDocument('whiteboards', whiteboardId, {
          ...updates,
          updatedAt: new Date().toISOString()
        });
        
        // Update local state
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
      }
      
      // Clear pending updates
      pendingUpdatesRef.current = [];
    } catch (error) {
      console.error('Error processing pending updates:', error);
      setError('Failed to process updates: ' + error.message);
    }
  };

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

      // Update cache
      if (whiteboardsCacheRef.current[userId]) {
        whiteboardsCacheRef.current[userId] = [...whiteboardsCacheRef.current[userId], savedWhiteboard];
      } else {
        whiteboardsCacheRef.current[userId] = [savedWhiteboard];
      }

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

      // Check cache first
      const cachedWhiteboard = whiteboards.find(wb => wb.id === whiteboardId);
      if (cachedWhiteboard) {
        setCurrentWhiteboard(cachedWhiteboard);
        return cachedWhiteboard;
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
      
      // Add to pending updates
      pendingUpdatesRef.current.push({
        whiteboardId,
        updates: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      });
      
      // Clear any existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Set a new timeout to process updates in batch
      updateTimeoutRef.current = setTimeout(() => {
        processPendingUpdates();
      }, 2000); // Process updates after 2 seconds of inactivity
      
      // Update local state immediately for better UX
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
      
      // Remove from cache
      if (whiteboardsCacheRef.current[user.uid]) {
        whiteboardsCacheRef.current[user.uid] = whiteboardsCacheRef.current[user.uid].filter(
          wb => wb.id !== whiteboardId
        );
      }
      
      // Delete from Firestore
      await deleteDocument('whiteboards', whiteboardId);
      
      // Update local state
      setWhiteboards(prevWhiteboards => 
        prevWhiteboards.filter(wb => wb.id !== whiteboardId)
      );
      
      // Update current whiteboard if it's the one being deleted
      if (currentWhiteboard?.id === whiteboardId) {
        setCurrentWhiteboard(whiteboards.find(wb => wb.id !== whiteboardId) || null);
      }
    } catch (error) {
      console.error('Error deleting whiteboard:', error);
      setError('Failed to delete whiteboard: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Process any remaining updates before unmounting
      if (pendingUpdatesRef.current.length > 0) {
        processPendingUpdates();
      }
    };
  }, []);

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

export default WhiteboardContext; 