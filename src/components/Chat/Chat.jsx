import React, { useState, useEffect, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import SearchUserCard from './SearchUserCard';
import FriendRequests from './FriendRequests';
import FriendCard from './FriendCard';
import ChatBox from './ChatBox';
import { FiSearch, FiX } from 'react-icons/fi';
import './Chat.css';
import { debounce } from 'lodash';

const Chat = () => {
  const { 
    searchResults, 
    friends, 
    searchUsers, 
    loading, 
    setSearchResults, 
    sendFriendRequest, 
    cancelFriendRequest,
    outgoingFriendRequests 
  } = useChat();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleAddFriend = async (userData) => {
    try {
      await sendFriendRequest(userData.id);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleCancelRequest = async (userData) => {
    try {
      await cancelFriendRequest(userData.id);
    } catch (error) {
      console.error('Error cancelling friend request:', error);
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setSearchTerm('');
      setSearchResults([]);
    }
  };

  const SearchBox = () => (
    <div className="search-section">
      <div className="search-input-container">
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
      {!isSearching && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((userData) => (
            <SearchUserCard
              key={userData.id}
              user={userData}
              onAddFriend={() => handleAddFriend(userData)}
              onCancelRequest={() => handleCancelRequest(userData)}
              isFriend={friends.includes(userData.id)}
              hasRequest={outgoingFriendRequests.includes(userData.id)}
            />
          ))}
        </div>
      )}
      {!isSearching && searchTerm && searchResults.length === 0 && (
        <div className="no-results">No users found</div>
      )}
    </div>
  );

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Friends</h3>
          <button className="search-toggle-btn" onClick={toggleSearch}>
            {isSearchOpen ? <FiX /> : <FiSearch />}
          </button>
        </div>

        {!isMobile && <SearchBox />}
        {isMobile && isSearchOpen && (
          <div className="mobile-search-overlay">
            <div className="mobile-search-content">
              <div className="mobile-search-header">
                <h3>Search Users</h3>
                <button className="close-search-btn" onClick={toggleSearch}>
                  <FiX />
                </button>
              </div>
              <SearchBox />
            </div>
          </div>
        )}

        <FriendRequests />

        <div className="friends-section">
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