import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCommunity } from '../context/CommunityContext';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Community.css';

const Community = () => {
  const { user } = useAuth();
  const { 
    posts, 
    loading, 
    error, 
    selectedTag, 
    setSelectedTag,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    addComment,
    getComments,
    updateComment,
    deleteComment,
    addReply,
    updateReply,
    deleteReply
  } = useCommunity();

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [comments, setComments] = useState({});
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState('');
  const fileInputRef = useRef(null);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postTags, setPostTags] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [postError, setError] = useState('');

  // Load comments for expanded post
  useEffect(() => {
    const loadComments = async () => {
      if (expandedPostId) {
        try {
          const postComments = await getComments(expandedPostId);
          console.log('Loaded comments:', postComments); // Debug log
          setComments(prev => ({
            ...prev,
            [expandedPostId]: postComments
          }));
        } catch (error) {
          console.error('Error loading comments:', error);
        }
      }
    };

    loadComments();
  }, [expandedPostId, getComments]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedImage) return;

    try {
      setIsUploading(true);
      const tags = newPostTags.split(',').map(tag => tag.trim()).filter(Boolean);
      await createPost({
        content: newPostContent,
        image: selectedImage,
        tags
      });
      setNewPostContent('');
      setNewPostTags('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditPost = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      setEditingPost(postId);
      setPostContent(post.content);
      setPostImage(post.image);
      setPostTags(post.tags || []);
    } catch (error) {
      console.error('Error preparing post for edit:', error);
      setError('Failed to prepare post for editing');
    }
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingPost) return;

      const updateData = {
        content: postContent,
        tags: postTags,
        image: postImage
      };

      await updatePost(editingPost, updateData);
      setEditingPost(null);
      setPostContent('');
      setPostImage(null);
      setPostTags([]);
    } catch (error) {
      console.error('Error saving post edit:', error);
      setError('Failed to save post changes');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Create a reference to the file location in Firebase Storage
        const storageRef = ref(storage, `post-images/${Date.now()}-${file.name}`);
        
        // Upload the file
        await uploadBytes(storageRef, file);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        setSelectedImage(downloadURL);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image. Please try again.');
      }
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(postId);
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleAddComment = async (postId) => {
    if (!newCommentText.trim()) return;

    try {
      console.log('Adding comment to post:', postId);
      const result = await addComment(postId, newCommentText);
      console.log('Comment added:', result);
      setNewCommentText('');
      // Refresh comments
      const updatedComments = await getComments(postId);
      console.log('Updated comments:', updatedComments);
      setComments(prev => ({
        ...prev,
        [postId]: updatedComments
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddReply = async (postId, commentId) => {
    if (!replyText.trim()) return;

    try {
      console.log('Adding reply to comment:', commentId, 'in post:', postId);
      const result = await addReply(postId, commentId, replyText);
      console.log('Reply added:', result);
      setReplyText('');
      setReplyingToCommentId(null);
      // Refresh comments
      const updatedComments = await getComments(postId);
      console.log('Updated comments with replies:', updatedComments);
      setComments(prev => ({
        ...prev,
        [postId]: updatedComments
      }));
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleEditComment = async (postId, commentId) => {
    if (!editedCommentText.trim()) return;
    
    try {
      await updateComment(postId, commentId, editedCommentText);
      // Refresh comments for this post
      const updatedComments = await getComments(postId);
      setComments(prev => ({
        ...prev,
        [postId]: updatedComments
      }));
      setEditingCommentId(null);
      setEditedCommentText('');
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(postId, commentId);
        // Refresh comments
        const updatedComments = await getComments(postId);
        setComments(prev => ({
          ...prev,
          [postId]: updatedComments
        }));
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleEditReply = async (postId, commentId, replyId) => {
    if (!editedReplyText.trim()) return;
    
    try {
      await updateReply(postId, commentId, replyId, editedReplyText);
      // Refresh comments
      const updatedComments = await getComments(postId);
      setComments(prev => ({
        ...prev,
        [postId]: updatedComments
      }));
      setEditingReplyId(null);
      setEditedReplyText('');
    } catch (error) {
      console.error('Error editing reply:', error);
    }
  };

  const handleDeleteReply = async (postId, commentId, replyId) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        await deleteReply(postId, commentId, replyId);
        // Refresh comments
        const updatedComments = await getComments(postId);
        setComments(prev => ({
          ...prev,
          [postId]: updatedComments
        }));
      } catch (error) {
        console.error('Error deleting reply:', error);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleFormatText = (command) => {
    if (command === 'bold') {
      document.execCommand('bold', false, null);
    } else if (command === 'italic') {
      document.execCommand('italic', false, null);
    } else if (command === 'underline') {
      document.execCommand('underline', false, null);
    } else if (command === 'alignLeft') {
      document.execCommand('justifyLeft', false, null);
    } else if (command === 'alignCenter') {
      document.execCommand('justifyCenter', false, null);
    } else if (command === 'alignRight') {
      document.execCommand('justifyRight', false, null);
    } else if (command === 'link') {
      const url = prompt('Enter the URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    }
  };

  const processContent = (content) => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Replace URLs with clickable links
    return content.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="post-link">${url}</a>`;
    });
  };

  if (!user) {
    return (
      <div className="community-container">
        <div className="login-required">
          <h2>Please log in to view the community</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="community-container">
        <div className="loading">Loading posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="community-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="community-container">
      <div className="community-content">
        <h1 className="community-heading">COMMUNITY </h1>
        {/* Posts Feed */}
        <div className="posts-feed">
          {posts.length === 0 ? (
            <div className="no-posts">
              <h2>No posts yet</h2>
              <p>Be the first to share your thoughts with the community!</p>
              <p>Create a post to start the conversation.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="post">
                <div className="post-header">
                  <div className="user-info">
                    {post.profilePic ? (
                      <img src={post.profilePic} alt={post.username} />
                    ) : (
                      <div className="user-initials">
                        {post.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3>{post.username}</h3>
                      <span className="timestamp">
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>
                  {post.userId === user.uid && (
                    <div className="post-actions">
                      <button 
                        className="edit-post-btn"
                        onClick={() => handleEditPost(post.id)}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-post-btn"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="post-content">
                  {editingPost === post.id ? (
                    <div className="edit-post-form">
                      <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Edit your post..."
                        rows={4}
                      />
                      {post.image && (
                        <div className="image-preview">
                          <img src={post.image} alt="Post" />
                          <div className="image-note">Image cannot be edited</div>
                        </div>
                      )}
                      <div className="edit-actions">
                        <button onClick={handleSaveEdit} className="save-button">
                          Save Changes
                        </button>
                        <button onClick={() => setEditingPost(null)} className="cancel-button">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="post-text-content" 
                        dangerouslySetInnerHTML={{ 
                          __html: processContent(post.content) 
                        }}
                      ></div>
                      {post.image && (
                        <img src={post.image} alt="Post content" className="post-image" />
                      )}
                      {post.tags && post.tags.length > 0 && (
                        <div className="post-tags">
                          {post.tags.map(tag => (
                            <span key={tag} className="tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="post-footer">
                  <button
                    className={`like-button ${post.likes?.includes(user.uid) ? 'liked' : ''}`}
                    onClick={() => toggleLike(post.id)}
                  >
                    ❤️ {post.likes?.length || 0}
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  >
                    💬 {post.commentCount || 0}
                  </button>
                </div>
                
                {/* Comments Section */}
                {expandedPostId === post.id && (
                  <div className="comments-section">
                    <div className="add-comment">
                      <textarea
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                      />
                      <button 
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newCommentText.trim()}
                      >
                        Comment
                      </button>
                    </div>
                    <div className="comments-list">
                      {comments[post.id] && comments[post.id].length > 0 ? (
                        comments[post.id].map(comment => (
                          <div key={comment.id} className="comment">
                            <div className="comment-header">
                              <span className="comment-username">{comment.username}</span>
                              <span className="comment-timestamp">
                                {formatDate(comment.createdAt)}
                              </span>
                              {comment.userId === user.uid && (
                                <div className="comment-actions">
                                  {editingCommentId === comment.id ? (
                                    <>
                                      <button 
                                        className="save-comment-btn"
                                        onClick={() => handleEditComment(post.id, comment.id)}
                                        disabled={!editedCommentText.trim()}
                                      >
                                        Save
                                      </button>
                                      <button 
                                        className="cancel-comment-btn"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditedCommentText('');
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        className="edit-comment-btn"
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditedCommentText(comment.content);
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button 
                                        className="delete-comment-btn"
                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            {editingCommentId === comment.id ? (
                              <textarea
                                className="edit-comment-input"
                                value={editedCommentText}
                                onChange={(e) => setEditedCommentText(e.target.value)}
                                placeholder="Edit your comment..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEditComment(post.id, comment.id);
                                  }
                                }}
                              />
                            ) : (
                              <p className="comment-content">{comment.content}</p>
                            )}

                            {/* Reply button */}
                            <button 
                              className="reply-button"
                              onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                            >
                              Reply
                            </button>

                            {/* Reply input */}
                            {replyingToCommentId === comment.id && (
                              <div className="reply-input-container">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  className="reply-input"
                                />
                                <button 
                                  onClick={() => handleAddReply(post.id, comment.id)}
                                  disabled={!replyText.trim()}
                                  className="reply-submit-btn"
                                >
                                  Reply
                                </button>
                              </div>
                            )}

                            {/* Replies section */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="replies-section">
                                {comment.replies.map(reply => (
                                  <div key={reply.id} className="reply">
                                    <div className="reply-header">
                                      <span className="reply-username">{reply.username}</span>
                                      <span className="reply-timestamp">
                                        {formatDate(reply.createdAt)}
                                      </span>
                                      {reply.userId === user.uid && (
                                        <div className="reply-actions">
                                          {editingReplyId === reply.id ? (
                                            <>
                                              <button 
                                                className="save-reply-btn"
                                                onClick={() => handleEditReply(post.id, comment.id, reply.id)}
                                                disabled={!editedReplyText.trim()}
                                              >
                                                Save
                                              </button>
                                              <button 
                                                className="cancel-reply-btn"
                                                onClick={() => {
                                                  setEditingReplyId(null);
                                                  setEditedReplyText('');
                                                }}
                                              >
                                                Cancel
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button 
                                                className="edit-reply-btn"
                                                onClick={() => {
                                                  setEditingReplyId(reply.id);
                                                  setEditedReplyText(reply.content);
                                                }}
                                              >
                                                Edit
                                              </button>
                                              <button 
                                                className="delete-reply-btn"
                                                onClick={() => handleDeleteReply(post.id, comment.id, reply.id)}
                                              >
                                                Delete
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {editingReplyId === reply.id ? (
                                      <textarea
                                        className="edit-reply-input"
                                        value={editedReplyText}
                                        onChange={(e) => setEditedReplyText(e.target.value)}
                                        placeholder="Edit your reply..."
                                      />
                                    ) : (
                                      <p className="reply-content">{reply.content}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="no-comments">No comments yet. Be the first to comment!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sticky Create Post Form */}
      <div className="create-post">
        <form onSubmit={handleCreatePost}>
          <div className="post-input-container">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's on your mind?"
              required={!selectedImage}
            />
            <div className="post-actions">
              <div className="post-options">
                <label className="image-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  📷
                </label>
                <input
                  type="text"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                  placeholder="Add tags"
                  className="tags-input"
                />
              </div>
              <button 
                type="submit" 
                className="post-submit-btn"
                disabled={isUploading || (!newPostContent.trim() && !selectedImage)}
              >
                {isUploading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
          {selectedImage && (
            <div className="selected-image-container">
              <img src={selectedImage} alt="Selected" />
              <button 
                type="button" 
                className="remove-image-btn"
                onClick={handleRemoveImage}
              >
                ×
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Formatting Toolbar
      <div className="formatting-toolbar">
        <button onClick={() => handleFormatText('bold')}>B</button>
        <button onClick={() => handleFormatText('italic')}>I</button>
        <button onClick={() => handleFormatText('underline')}>U</button>
        <button onClick={() => handleFormatText('alignLeft')}>Left</button>
        <button onClick={() => handleFormatText('alignCenter')}>Center</button>
        <button onClick={() => handleFormatText('alignRight')}>Right</button>
        <button onClick={() => handleFormatText('link')}>Link</button>
      </div> */}
    </div>
  );
};

export default Community; 