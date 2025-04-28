import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDoc
} from 'firebase/firestore';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search users
  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      
      // Search by email
      const emailQuery = query(
        usersRef,
        where('email', '>=', searchTerm),
        where('email', '<=', searchTerm + '\uf8ff')
      );
      
      // Search by username
      const usernameQuery = query(
        usersRef,
        where('username', '>=', searchTerm),
        where('username', '<=', searchTerm + '\uf8ff')
      );

      const [emailSnapshot, usernameSnapshot] = await Promise.all([
        getDocs(emailQuery),
        getDocs(usernameQuery)
      ]);

      // Combine and deduplicate results
      const results = new Map();
      
      [...emailSnapshot.docs, ...usernameSnapshot.docs].forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        if (userData.id !== user.uid) {
          results.set(userData.id, userData);
        }
      });

      setSearchResults(Array.from(results.values()));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (targetUserId) => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUserId);

      // Get current user data
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Get target user data
      const targetUserDoc = await getDoc(targetUserRef);
      const targetUserData = targetUserDoc.data();

      // Check if request already exists
      if (userData.outgoingFriendRequests?.includes(targetUserId)) {
        throw new Error('Friend request already sent');
      }

      // Check if already friends
      if (userData.friends?.includes(targetUserId)) {
        throw new Error('Already friends with this user');
      }

      // Initialize arrays if they don't exist
      const currentOutgoingRequests = userData.outgoingFriendRequests || [];
      const currentIncomingRequests = targetUserData.incomingFriendRequests || [];

      // Update current user's outgoing requests
      await updateDoc(userRef, {
        outgoingFriendRequests: arrayUnion(targetUserId)
      });

      // Update target user's incoming requests
      await updateDoc(targetUserRef, {
        incomingFriendRequests: arrayUnion(user.uid)
      });

      // Update local state
      setOutgoingFriendRequests(prev => [...prev, targetUserId]);

      console.log('Friend request sent successfully');
      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requestingUserId) => {
    try {
      if (!user || !requestingUserId) {
        console.error('Invalid user data:', { currentUser: user, requestingUser: requestingUserId });
        throw new Error('Invalid user data');
      }

      const userRef = doc(db, 'users', user.uid);
      const requestingUserRef = doc(db, 'users', requestingUserId);

      // Create chat document with proper structure
      const chatId = [user.uid, requestingUserId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      
      // Create chat with initial data - using array format for members
      const chatData = {
        members: [user.uid, requestingUserId],
        lastMessage: '',
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      console.log('Creating chat with data:', {
        chatId,
        members: chatData.members,
        currentUser: user.uid,
        requestingUser: requestingUserId
      });

      // Create the chat document
      await setDoc(chatRef, chatData);

      // Verify chat was created correctly
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        throw new Error('Failed to create chat document');
      }

      const createdChatData = chatDoc.data();
      console.log('Created chat data:', {
        chatId,
        members: createdChatData.members,
        currentUser: user.uid,
        requestingUser: requestingUserId
      });

      // Update both users' friends lists and remove the friend request
      await updateDoc(userRef, {
        friends: arrayUnion(requestingUserId),
        incomingFriendRequests: arrayRemove(requestingUserId)
      });

      await updateDoc(requestingUserRef, {
        friends: arrayUnion(user.uid),
        outgoingFriendRequests: arrayRemove(user.uid)
      });

      // Set this as the active chat
      setActiveChat(chatId);
      
      console.log('Friend request accepted and chat created successfully:', {
        chatId,
        members: createdChatData.members
      });

      return chatId;
    } catch (error) {
      console.error('Error accepting friend request:', {
        error: error.message,
        currentUser: user?.uid,
        requestingUser: requestingUserId
      });
      throw error;
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (requestingUserId) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const requestingUserRef = doc(db, 'users', requestingUserId);

      await updateDoc(userRef, {
        incomingFriendRequests: arrayRemove(requestingUserId)
      });

      await updateDoc(requestingUserRef, {
        outgoingFriendRequests: arrayRemove(user.uid)
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  // Cancel friend request
  const cancelFriendRequest = async (targetUserId) => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUserId);

      // Get current user data
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Get target user data
      const targetUserDoc = await getDoc(targetUserRef);
      const targetUserData = targetUserDoc.data();

      // Check if request exists
      if (!userData.outgoingFriendRequests?.includes(targetUserId)) {
        throw new Error('No friend request found to cancel');
      }

      // Remove from current user's outgoing requests
      await updateDoc(userRef, {
        outgoingFriendRequests: arrayRemove(targetUserId)
      });

      // Remove from target user's incoming requests
      await updateDoc(targetUserRef, {
        incomingFriendRequests: arrayRemove(user.uid)
      });

      console.log('Friend request cancelled successfully');
      return { success: true };
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async (chatId, message) => {
    try {
      if (!chatId || !message?.trim()) {
        console.error('Invalid chatId or message:', { chatId, message });
        throw new Error('Invalid chat ID or message');
      }

      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        console.error('Chat document does not exist:', chatId);
        throw new Error('Chat does not exist');
      }

      const chatData = chatDoc.data();
      
      // Check if members is an array or object
      const isMember = Array.isArray(chatData.members) 
        ? chatData.members.includes(user.uid)
        : chatData.members && chatData.members[user.uid] === true;

      console.log('Chat data:', {
        chatId,
        members: chatData.members,
        currentUser: user.uid,
        hasMembers: !!chatData.members,
        isMember,
        membersType: Array.isArray(chatData.members) ? 'array' : 'object'
      });

      if (!chatData.members || !isMember) {
        console.error('Membership check failed:', {
          chatId,
          hasMembers: !!chatData.members,
          isMember,
          members: chatData.members,
          currentUser: user.uid,
          membersType: Array.isArray(chatData.members) ? 'array' : 'object'
        });
        throw new Error('User is not a member of this chat');
      }

      const messageData = {
        text: message.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp()
      };

      // Add message to subcollection
      const messagesRef = collection(chatRef, 'messages');
      await addDoc(messagesRef, messageData);

      // Update chat document
      await updateDoc(chatRef, {
        lastMessage: message.trim(),
        lastUpdated: serverTimestamp()
      });

      console.log('Message sent successfully:', {
        chatId,
        messageId: messageData.senderId,
        timestamp: messageData.timestamp
      });

    } catch (error) {
      console.error('Error sending message:', {
        error: error.message,
        chatId,
        userId: user.uid
      });
      throw error;
    }
  };

  // Load friend requests and friends
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setFriendRequests(userData.incomingFriendRequests || []);
        setOutgoingFriendRequests(userData.outgoingFriendRequests || []);
        setFriends(userData.friends || []);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat || !user) return;

    const messagesRef = collection(db, `chats/${activeChat}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [activeChat, user]);

  // Load chats for the user
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where(`members.${user.uid}`, '==', true),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Chats loaded:', chats);
    });

    return () => unsubscribe();
  }, [user]);

  const value = {
    searchResults,
    friendRequests,
    outgoingFriendRequests,
    friends,
    activeChat,
    messages,
    loading,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    sendMessage,
    setActiveChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext; 