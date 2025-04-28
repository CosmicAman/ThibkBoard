import React from 'react';
import './SearchUserCard.css';

const SearchUserCard = ({ user, onAddFriend, onCancelRequest, isFriend, hasRequest }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="search-user-card">
      <div className="search-user-avatar">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.username || 'User'} />
        ) : (
          <div className="avatar-placeholder">
            {getInitials(user.username || user.email)}
          </div>
        )}
      </div>
      <div className="search-user-info">
        <h4>{user.username || 'Unknown User'}</h4>
        <p>{user.email || 'No email provided'}</p>
      </div>
      {hasRequest ? (
        <button
          className="cancel-request-btn"
          onClick={() => onCancelRequest(user)}
        >
          Cancel Request
        </button>
      ) : (
        <button
          className="add-friend-btn"
          onClick={() => onAddFriend(user)}
          disabled={isFriend}
        >
          {isFriend ? 'Friends' : 'Add Friend'}
        </button>
      )}
    </div>
  );
};

export default SearchUserCard; 