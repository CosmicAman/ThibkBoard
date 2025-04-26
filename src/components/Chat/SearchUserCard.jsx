import React from 'react';
import './SearchUserCard.css';

const SearchUserCard = ({ user, onAddFriend, isFriend, hasRequest }) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="search-user-card">
      <div className="search-user-avatar">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} />
        ) : (
          <div className="avatar-placeholder">
            {getInitials(user.displayName)}
          </div>
        )}
      </div>
      <div className="search-user-info">
        <h4>{user.displayName}</h4>
        <p>{user.email}</p>
      </div>
      <button
        className="add-friend-btn"
        onClick={() => onAddFriend(user)}
        disabled={isFriend || hasRequest}
      >
        {isFriend ? 'Friends' : hasRequest ? 'Request Sent' : 'Add Friend'}
      </button>
    </div>
  );
};

export default SearchUserCard; 