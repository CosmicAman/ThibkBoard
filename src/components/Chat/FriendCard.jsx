import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './FriendCard.css';

const FriendCard = ({ friendId }) => {
  const { setActiveChat } = useChat();
  const { user } = useAuth();
  const [friendData, setFriendData] = useState(null);

  useEffect(() => {
    // Set up a real-time listener for friend data
    const friendRef = doc(db, 'users', friendId);
    const unsubscribe = onSnapshot(friendRef, (doc) => {
      if (doc.exists()) {
        setFriendData(doc.data());
      }
    });

    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, [friendId]);

  const handleChatClick = () => {
    // Create a consistent chat ID by sorting user IDs
    const chatId = [user.uid, friendId].sort().join('_');
    setActiveChat(chatId);
  };

  if (!friendData) return null;

  return (
    <div className="friend-card" onClick={handleChatClick}>
      <div className="friend-avatar">
        {friendData.photoURL ? (
          <img src={friendData.photoURL} alt={friendData.displayName} />
        ) : (
          <div className="avatar-placeholder">
            {friendData.displayName?.[0] || friendData.email?.[0]}
          </div>
        )}
        {friendData.onlineStatus && (
          <span className="online-indicator"></span>
        )}
      </div>
      <div className="friend-info">
        <h4>{friendData.displayName || friendData.email}</h4>
        <p className={`friend-status ${friendData.onlineStatus ? 'online' : 'offline'}`}>
          {friendData.onlineStatus ? 'Online' : 'Offline'}
        </p>
      </div>
    </div>
  );
};

export default FriendCard; 