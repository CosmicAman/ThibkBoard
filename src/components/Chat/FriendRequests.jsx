import React, { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import './FriendRequests.css';

const FriendRequests = () => {
  const { friendRequests, acceptFriendRequest, rejectFriendRequest } = useChat();
  const [requesters, setRequesters] = useState([]);

  useEffect(() => {
    if (!friendRequests.length) {
      setRequesters([]);
      return;
    }

    const unsubscribes = friendRequests.map(requestingUserId => {
      const userRef = doc(db, 'users', requestingUserId);
      return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setRequesters(prev => {
            const newRequesters = [...prev];
            const index = newRequesters.findIndex(r => r.id === requestingUserId);
            if (index === -1) {
              newRequesters.push({ id: requestingUserId, ...doc.data() });
            } else {
              newRequesters[index] = { id: requestingUserId, ...doc.data() };
            }
            return newRequesters;
          });
        }
      });
    });

    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [friendRequests]);

  if (!requesters.length) {
    return null;
  }

  return (
    <div className="friend-requests">
      <h3>Friend Requests</h3>
      {requesters.map((requester) => (
        <div key={requester.id} className="request-card">
          <div className="request-avatar">
            {requester.photoURL ? (
              <img src={requester.photoURL} alt={requester.displayName} />
            ) : (
              <div className="avatar-placeholder">
                {requester.displayName?.[0] || requester.email?.[0]}
              </div>
            )}
          </div>
          <div className="request-info">
            <h4>{requester.displayName || requester.email}</h4>
            <div className="request-actions">
              <button 
                className="accept-btn" 
                onClick={() => acceptFriendRequest(requester.id)}
              >
                Accept
              </button>
              <button 
                className="reject-btn" 
                onClick={() => rejectFriendRequest(requester.id)}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendRequests; 