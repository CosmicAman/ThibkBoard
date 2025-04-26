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
  setDoc,
  writeBatch
} from 'firebase/firestore';

const db = getFirestore(app);

// Cache for document references
const docRefCache = {};

// Cache for document data
const docDataCache = {};
const docDataCacheExpiry = {};

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

// Helper function to get a document reference
export const getDocRef = (collectionName, docId) => {
  const cacheKey = `${collectionName}/${docId}`;
  if (!docRefCache[cacheKey]) {
    docRefCache[cacheKey] = doc(db, collectionName, docId);
  }
  return docRefCache[cacheKey];
};

// Helper function to get a collection reference
export const getCollectionRef = (collectionName) => {
  return collection(db, collectionName);
};

// Helper function to check if cache is valid
const isCacheValid = (cacheKey) => {
  return docDataCache[cacheKey] && 
         docDataCacheExpiry[cacheKey] && 
         Date.now() < docDataCacheExpiry[cacheKey];
};

// Helper function to set cache
const setCache = (cacheKey, data) => {
  docDataCache[cacheKey] = data;
  docDataCacheExpiry[cacheKey] = Date.now() + CACHE_EXPIRY_TIME;
};

// Helper function to clear cache
const clearCache = (cacheKey) => {
  delete docDataCache[cacheKey];
  delete docDataCacheExpiry[cacheKey];
};

// Get a single document
export const getDocument = async (collectionName, docId) => {
  try {
    const cacheKey = `${collectionName}/${docId}`;
    
    // Check cache first
    if (isCacheValid(cacheKey)) {
      console.log(`Using cached document: ${cacheKey}`);
      return docDataCache[cacheKey];
    }
    
    const docRef = getDocRef(collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() };
      setCache(cacheKey, data);
      return data;
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
    
    // Create a cache key based on filters
    const filterKey = JSON.stringify(filters);
    const cacheKey = `${collectionName}:${filterKey}`;
    
    // Check cache first
    if (isCacheValid(cacheKey)) {
      console.log(`Using cached documents: ${cacheKey}`);
      return docDataCache[cacheKey];
    }
    
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
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cache the results
    setCache(cacheKey, results);
    
    return results;
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
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Clear collection cache to ensure fresh data on next fetch
    Object.keys(docDataCache).forEach(key => {
      if (key.startsWith(`${collectionName}:`)) {
        clearCache(key);
      }
    });
    
    return docRef;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

// Update a document
export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    
    // Update the document
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    // Clear document cache
    clearCache(`${collectionName}/${docId}`);
    
    // Clear collection cache to ensure fresh data on next fetch
    Object.keys(docDataCache).forEach(key => {
      if (key.startsWith(`${collectionName}:`)) {
        clearCache(key);
      }
    });
    
    return true;
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
    
    // Clear document cache
    clearCache(`${collectionName}/${docId}`);
    
    // Clear collection cache to ensure fresh data on next fetch
    Object.keys(docDataCache).forEach(key => {
      if (key.startsWith(`${collectionName}:`)) {
        clearCache(key);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Batch update multiple documents
export const batchUpdateDocuments = async (updates) => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ collectionName, docId, data }) => {
      const docRef = getDocRef(collectionName, docId);
      batch.update(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
    // Clear all affected caches
    updates.forEach(({ collectionName, docId }) => {
      clearCache(`${collectionName}/${docId}`);
      
      // Clear collection cache
      Object.keys(docDataCache).forEach(key => {
        if (key.startsWith(`${collectionName}:`)) {
          clearCache(key);
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error batch updating documents:', error);
    throw error;
  }
};

// Notes operations
export const getNotes = async (userId) => {
  return getDocuments('notes', [['userId', '==', userId]]);
};

export const getNote = async (noteId) => {
  return getDocument('notes', noteId);
};

export const createNote = async (userId, noteData) => {
  return addDocument('notes', { ...noteData, userId });
};

export const updateNote = async (noteId, noteData) => {
  return updateDocument('notes', noteId, noteData);
};

export const deleteNote = async (noteId) => {
  return deleteDocument('notes', noteId);
};

// Whiteboard operations
export const getWhiteboards = async (userId) => {
  return getDocuments('whiteboards', [['userId', '==', userId]]);
};

export const getWhiteboard = async (whiteboardId) => {
  return getDocument('whiteboards', whiteboardId);
};

export const createWhiteboard = async (userId, whiteboardData) => {
  return addDocument('whiteboards', { 
    ...whiteboardData, 
    userId,
    sharedWith: []
  });
};

export const updateWhiteboard = async (whiteboardId, whiteboardData) => {
  return updateDocument('whiteboards', whiteboardId, whiteboardData);
};

export const deleteWhiteboard = async (whiteboardId) => {
  return deleteDocument('whiteboards', whiteboardId);
};

export const shareWhiteboard = async (whiteboardId, userId) => {
  const docRef = getDocRef('whiteboards', whiteboardId);
  await updateDoc(docRef, {
    sharedWith: arrayUnion(userId),
    updatedAt: serverTimestamp()
  });
  
  // Clear caches
  clearCache(`whiteboards/${whiteboardId}`);
  Object.keys(docDataCache).forEach(key => {
    if (key.startsWith('whiteboards:')) {
      clearCache(key);
    }
  });
  
  return true;
};

export const unshareWhiteboard = async (whiteboardId, userId) => {
  const docRef = getDocRef('whiteboards', whiteboardId);
  await updateDoc(docRef, {
    sharedWith: arrayRemove(userId),
    updatedAt: serverTimestamp()
  });
  
  // Clear caches
  clearCache(`whiteboards/${whiteboardId}`);
  Object.keys(docDataCache).forEach(key => {
    if (key.startsWith('whiteboards:')) {
      clearCache(key);
    }
  });
  
  return true;
};

// User operations
export const createUser = async (userData) => {
  return addDocument('users', {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateUser = async (uid, userData) => {
  return updateDocument('users', uid, userData);
};

export const getUser = async (uid) => {
  return getDocument('users', uid);
};

export default db; 