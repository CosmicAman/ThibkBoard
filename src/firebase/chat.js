import db from './firestore';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export const sendMessage = async (senderId, receiverId, message) => {
  try {
    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
      senderId,
      receiverId,
      message,
      timestamp: new Date()
    });
  } catch (error) {
    throw error;
  }
};

export const getMessages = async (userId, otherUserId) => {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('senderId', 'in', [userId, otherUserId]),
      where('receiverId', 'in', [userId, otherUserId])
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    throw error;
  }
}; 