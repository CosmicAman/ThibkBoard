import { getFirestore } from 'firebase/firestore';
import app from './config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc
} from 'firebase/firestore';

const db = getFirestore(app);

// Helper function to get a document reference
export const getDocRef = (collectionName, docId) => {
  return doc(db, collectionName, docId);
};

// Helper function to get a collection reference
export const getCollectionRef = (collectionName) => {
  return collection(db, collectionName);
};

// Get a single document
export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

// Get all documents in a collection
export const getDocuments = async (collectionName, filters = []) => {
  try {
    const collectionRef = collection(db, collectionName);
    let queryRef = collectionRef;
    
    // Handle both array and object filter formats
    if (Array.isArray(filters)) {
      const queryConstraints = filters.map(filter => {
        if (filter.length === 3) {
          const [field, operator, value] = filter;
          return where(field, operator, value);
        }
        return null;
      }).filter(Boolean);
      
      if (queryConstraints.length > 0) {
        queryRef = query(collectionRef, ...queryConstraints);
      }
    } else if (filters && typeof filters === 'object') {
      // Handle object format with 'where' property
      if (filters.where && Array.isArray(filters.where)) {
        const [field, operator, value] = filters.where;
        queryRef = query(collectionRef, where(field, operator, value));
      }
    }

    const querySnapshot = await getDocs(queryRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
};

// Add a new document
export const addDocument = async (collectionName, data) => {
  try {
    console.log(`Attempting to add document to collection: ${collectionName}`);
    console.log('Document data:', data);

    if (!collectionName) {
      throw new Error('Collection name is required');
    }

    if (!data) {
      throw new Error('Document data is required');
    }

    const collectionRef = getCollectionRef(collectionName);
    if (!collectionRef) {
      throw new Error('Failed to get collection reference');
    }

    console.log('Adding document to Firestore...');
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (!docRef) {
      throw new Error('Failed to get document reference after creation');
    }

    if (!docRef.id) {
      throw new Error('Document created but no ID returned');
    }

    console.log(`Document successfully created in ${collectionName} with ID:`, docRef.id);
    return docRef;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Update a document
export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

// Delete a document
export const deleteDocument = async (collectionName, docId) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Notes specific operations
export const getNotes = async (userId) => {
  return getDocuments('notes', [
    { field: 'userId', operator: '==', value: userId }
  ]);
};

export const getNote = async (noteId) => {
  return getDocument('notes', noteId);
};

export const createNote = async (userId, noteData) => {
  return addDocument('notes', { userId, ...noteData });
};

export const updateNote = async (noteId, noteData) => {
  return updateDocument('notes', noteId, noteData);
};

export const deleteNote = async (noteId) => {
  return deleteDocument('notes', noteId);
};

// Whiteboard specific operations
export const getWhiteboards = async (userId) => {
  return getDocuments('whiteboards', [
    { field: 'userId', operator: '==', value: userId }
  ]);
};

export const getWhiteboard = async (whiteboardId) => {
  return getDocument('whiteboards', whiteboardId);
};

export const createWhiteboard = async (userId, whiteboardData) => {
  return addDocument('whiteboards', {
    userId,
    title: whiteboardData.title || 'Untitled Whiteboard',
    content: whiteboardData.content || '',
    sharedWith: [],
    ...whiteboardData
  });
};

export const updateWhiteboard = async (whiteboardId, whiteboardData) => {
  return updateDocument('whiteboards', whiteboardId, whiteboardData);
};

export const deleteWhiteboard = async (whiteboardId) => {
  return deleteDocument('whiteboards', whiteboardId);
};

export const shareWhiteboard = async (whiteboardId, userId) => {
  return updateDocument('whiteboards', whiteboardId, {
    sharedWith: arrayUnion(userId)
  });
};

export const unshareWhiteboard = async (whiteboardId, userId) => {
  return updateDocument('whiteboards', whiteboardId, {
    sharedWith: arrayRemove(userId)
  });
};

// User specific operations
export const createUser = async (userData) => {
  try {
    console.log('Creating user document:', userData);
    const userRef = doc(db, 'users', userData.uid);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
    console.log('User document created successfully');
    return userRef;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

export const updateUser = async (uid, userData) => {
  try {
    console.log('Updating user document:', uid, userData);
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
    console.log('User document updated successfully');
    return userRef;
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};

export const getUser = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

export default db; 