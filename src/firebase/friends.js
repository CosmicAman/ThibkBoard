import db from './firestore';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export const sendFriendRequest = async (senderId, receiverId) => {
  try {
    const requestsRef = collection(db, 'friendRequests');
    await addDoc(requestsRef, {
      senderId,
      receiverId,
      status: 'pending',
      timestamp: new Date()
    });
  } catch (error) {
    throw error;
  }
};

export const acceptFriendRequest = async (requestId) => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    await updateDoc(requestRef, {
      status: 'accepted'
    });
  } catch (error) {
    throw error;
  }
};

export const getFriendRequests = async (userId) => {
  try {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(requestsRef, where('receiverId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw error;
  }
}; 