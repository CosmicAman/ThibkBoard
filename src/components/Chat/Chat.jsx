import React, { useState, useEffect, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import SearchUserCard from './SearchUserCard';
import FriendRequests from './FriendRequests';
import FriendCard from './FriendCard';
import ChatBox from './ChatBox';
import { FiSearch } from 'react-icons/fi';
import './Chat.css';
import { debounce } from 'lodash';

const Chat = () => {
  const { searchResults, friends, searchUsers, loading, setSearchResults } = useChat();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchTerm) => {
        if (!searchTerm.trim()) {
          setSearchResults([]);
          return;
        }
        setIsSearching(true);
        try {
          await searchUsers(searchTerm);
        } catch (error) {
          console.error('Error searching users:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    [searchUsers, setSearchResults]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="search-section">
          <div className="search-input">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          {isSearching && <div className="search-loading">Searching...</div>}
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((userData) => (
                <SearchUserCard key={userData.id} userData={userData} />
              ))}
            </div>
          )}
        </div>

        <FriendRequests />

        <div className="friends-section">
          <h3>Friends</h3>
          {friends.length === 0 ? (
            <p className="no-friends">No friends yet</p>
          ) : (
            <div className="friends-list">
              {friends.map((friendId) => (
                <FriendCard key={friendId} friendId={friendId} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chat-main">
        <ChatBox />
      </div>
    </div>
  );
};

export default Chat; 