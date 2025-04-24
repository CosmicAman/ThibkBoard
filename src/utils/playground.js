import { db } from '../firebase/config';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export const savePlaygroundCode = async (userId, fileName, codeData) => {
  try {
    const playgroundRef = collection(db, 'playgrounds');
    const docRef = await addDoc(playgroundRef, {
      userId,
      fileName,
      html: codeData.html,
      css: codeData.css,
      js: codeData.js,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving playground code:', error);
    throw error;
  }
};

export const updatePlaygroundCode = async (playgroundId, codeData) => {
  try {
    const playgroundRef = doc(db, 'playgrounds', playgroundId);
    await updateDoc(playgroundRef, {
      html: codeData.html,
      css: codeData.css,
      js: codeData.js,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating playground code:', error);
    throw error;
  }
};

export const getUserPlaygrounds = async (userId) => {
  try {
    const playgroundsRef = collection(db, 'playgrounds');
    const q = query(playgroundsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user playgrounds:', error);
    throw error;
  }
};

export const getPlaygroundById = async (playgroundId) => {
  try {
    const playgroundRef = doc(db, 'playgrounds', playgroundId);
    const docSnap = await getDoc(playgroundRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching playground:', error);
    throw error;
  }
};

export const deletePlayground = async (playgroundId) => {
  try {
    const playgroundRef = doc(db, 'playgrounds', playgroundId);
    await deleteDoc(playgroundRef);
    return true;
  } catch (error) {
    console.error('Error deleting playground:', error);
    throw error;
  }
}; 