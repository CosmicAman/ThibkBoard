import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './ChatBox.css';

const ChatBox = () => {
  const { activeChat, messages, sendMessage, setActiveChat } = useChat();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [partnerName, setPartnerName] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchPartnerData = async () => {
      if (activeChat) {
        // Extract the other user's ID from the chat ID
        const [user1, user2] = activeChat.split('_');
        const partnerId = user1 === user.uid ? user2 : user1;
        setChatPartner(partnerId);

        try {
          // Fetch partner's data from Firestore
          const partnerDoc = await getDoc(doc(db, 'users', partnerId));
          if (partnerDoc.exists()) {
            const partnerData = partnerDoc.data();
            // Use username field from Firestore user document
            setPartnerName(partnerData.username || 'Unknown User');
          }
        } catch (error) {
          console.error('Error fetching partner data:', error);
          setPartnerName('Unknown User');
        }
      }
    };

    fetchPartnerData();
  }, [activeChat, user.uid]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    try {
      await sendMessage(activeChat, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!activeChat) {
    return (
      <div className="chat-box empty">
        <p>Select a friend to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>{partnerName ? `Chat with ${partnerName}` : 'Loading...'}</h3>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${
                message.senderId === user.uid ? 'sent' : 'received'
              }`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="timestamp">
                  {message.timestamp
                    ? format(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp), 'HH:mm')
                    : ''}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          autoComplete="off"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 