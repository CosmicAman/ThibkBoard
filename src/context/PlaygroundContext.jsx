import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  savePlaygroundCode,
  updatePlaygroundCode,
  getUserPlaygrounds,
  getPlaygroundById,
  deletePlayground
} from '../utils/playground';

const PlaygroundContext = createContext();

export const usePlayground = () => {
  const context = useContext(PlaygroundContext);
  if (!context) {
    throw new Error('usePlayground must be used within a PlaygroundProvider');
  }
  return context;
};

export const PlaygroundProvider = ({ children }) => {
  const { user } = useAuth();
  const [playgrounds, setPlaygrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      loadUserPlaygrounds();
    } else {
      setPlaygrounds([]);
      setLoading(false);
    }
  }, [user]);

  const loadUserPlaygrounds = async () => {
    try {
      setLoading(true);
      const userPlaygrounds = await getUserPlaygrounds(user.uid);
      setPlaygrounds(userPlaygrounds);
      setError(null);
    } catch (err) {
      setError('Failed to load playgrounds');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveCode = async (fileName, codeData) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      const playgroundId = await savePlaygroundCode(user.uid, fileName, codeData);
      await loadUserPlaygrounds();
      return playgroundId;
    } catch (err) {
      setError('Failed to save playground');
      console.error(err);
      throw err;
    }
  };

  const updateCode = async (playgroundId, codeData) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      await updatePlaygroundCode(playgroundId, codeData);
      await loadUserPlaygrounds();
    } catch (err) {
      setError('Failed to update playground');
      console.error(err);
      throw err;
    }
  };

  const loadPlayground = async (playgroundId) => {
    try {
      const playground = await getPlaygroundById(playgroundId);
      if (!playground) throw new Error('Playground not found');
      if (playground.userId !== user.uid) throw new Error('Unauthorized access');
      
      return playground;
    } catch (err) {
      setError('Failed to load playground');
      console.error(err);
      throw err;
    }
  };

  const deleteCode = async (playgroundId) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      await deletePlayground(playgroundId);
      await loadUserPlaygrounds();
    } catch (err) {
      setError('Failed to delete playground');
      console.error(err);
      throw err;
    }
  };

  const value = {
    playgrounds,
    loading,
    error,
    saveCode,
    updateCode,
    loadPlayground,
    deleteCode
  };

  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  );
}; 