import { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const NotesContext = createContext();

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export const NotesProvider = ({ children }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  console.log('NotesContext - Current user:', user);

  // Fetch notes for the current user
  useEffect(() => {
    if (!user) {
      console.log('No user found, clearing notes');
      setNotes([]);
      setLoading(false);
      return;
    }

    console.log('Setting up notes listener for user:', user.uid);
    const notesRef = collection(db, 'notes');
    let unsubscribe = null;
    
    // First try with the composite query
    const q = query(
      notesRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Use onSnapshot for real-time updates
    unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        try {
          const notesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('Notes updated:', notesData);
          setNotes(notesData);
          setError(null);
        } catch (err) {
          console.error('Error processing notes:', err);
          setError('Error processing notes');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in notes listener:', err);
        if (err.code === 'failed-precondition') {
          // If the index is missing, try a simpler query
          console.log('Index missing, trying simpler query');
          const simpleQ = query(
            notesRef,
            where('userId', '==', user.uid)
          );
          
          unsubscribe = onSnapshot(
            simpleQ,
            (querySnapshot) => {
              try {
                const notesData = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                console.log('Notes updated with simple query:', notesData);
                setNotes(notesData);
                setError(null);
              } catch (err) {
                console.error('Error processing notes with simple query:', err);
                setError('Error processing notes');
              } finally {
                setLoading(false);
              }
            },
            (err) => {
              console.error('Error in simple query listener:', err);
              setError('Failed to fetch notes');
              setLoading(false);
            }
          );
        } else if (err.code === 'not-found') {
          // Collection doesn't exist yet, initialize with empty array
          console.log('Notes collection does not exist yet');
          setNotes([]);
          setError(null);
          setLoading(false);
        } else {
          setError('Failed to fetch notes');
          setLoading(false);
        }
      }
    );

    // Cleanup subscription
    return () => {
      console.log('Cleaning up notes listener');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Create a new note
  const createNote = async (noteData) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to create a note');
      }

      const notesRef = collection(db, 'notes');
      const newNote = {
        ...noteData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(notesRef, newNote);
      
      // Update local state
      setNotes(prevNotes => [{
        id: docRef.id,
        ...newNote
      }, ...prevNotes]);
      
      return docRef.id;
    } catch (err) {
      console.error('Error creating note:', err);
      throw new Error(`Failed to create note: ${err.message}`);
    }
  };

  // Update an existing note
  const updateNote = async (noteId, noteData) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to update a note');
      }

      const noteRef = doc(db, 'notes', noteId);
      const noteDoc = await getDoc(noteRef);
      
      if (!noteDoc.exists()) {
        throw new Error('Note not found');
      }

      if (noteDoc.data().userId !== user.uid) {
        throw new Error('Not authorized to update this note');
      }

      const updatedNote = {
        ...noteData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(noteRef, updatedNote);
      
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId 
            ? { ...note, ...updatedNote }
            : note
        )
      );
    } catch (err) {
      console.error('Error updating note:', err);
      throw new Error(`Failed to update note: ${err.message}`);
    }
  };

  // Delete a note
  const deleteNote = async (noteId) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to delete a note');
      }

      const noteRef = doc(db, 'notes', noteId);
      const noteDoc = await getDoc(noteRef);
      
      if (!noteDoc.exists()) {
        throw new Error('Note not found');
      }

      if (noteDoc.data().userId !== user.uid) {
        throw new Error('Not authorized to delete this note');
      }

      await deleteDoc(noteRef);
      
      setNotes(prevNotes => 
        prevNotes.filter(note => note.id !== noteId)
      );
    } catch (err) {
      console.error('Error deleting note:', err);
      throw new Error(`Failed to delete note: ${err.message}`);
    }
  };

  // Toggle pin status of a note
  const togglePin = async (noteId) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to pin a note');
      }

      const noteRef = doc(db, 'notes', noteId);
      const noteDoc = await getDoc(noteRef);
      
      if (!noteDoc.exists()) {
        throw new Error('Note not found');
      }

      if (noteDoc.data().userId !== user.uid) {
        throw new Error('Not authorized to pin this note');
      }

      const note = notes.find(n => n.id === noteId);
      
      await updateDoc(noteRef, {
        pinned: !note.pinned,
        updatedAt: serverTimestamp()
      });
      
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId 
            ? { ...note, pinned: !note.pinned }
            : note
        )
      );
    } catch (err) {
      console.error('Error toggling pin:', err);
      throw new Error(`Failed to toggle pin status: ${err.message}`);
    }
  };

  // Get a single note by ID
  const getNoteById = (noteId) => {
    return notes.find(note => note.id === noteId);
  };

  // Get pinned notes
  const getPinnedNotes = () => {
    return notes.filter(note => note.pinned);
  };

  // Get notes by tag
  const getNotesByTag = (tag) => {
    return notes.filter(note => note.tags?.includes(tag));
  };

  const value = {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    getNoteById,
    getPinnedNotes,
    getNotesByTag
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}; 