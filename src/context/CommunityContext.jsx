import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CommunityContext = createContext();

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};

export const CommunityProvider = ({ children }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

  // Fetch posts
  useEffect(() => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const postsRef = collection(db, 'posts');
    let q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (selectedTag) {
      q = query(
        postsRef,
        where('tags', 'array-contains', selectedTag),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const postsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPosts(postsData);
          setError(null);
        } catch (err) {
          console.error('Error processing posts:', err);
          setError('Failed to process posts');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedTag]);

  // Create a new post
  const createPost = async (postData) => {
    try {
      if (!user) throw new Error('User must be logged in to create a post');

      const postsRef = collection(db, 'posts');
      const newPost = {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        profilePic: user.photoURL || null,
        content: postData.content,
        image: postData.image || null,
        tags: postData.tags || [],
        createdAt: serverTimestamp(),
        likes: [],
        commentCount: 0
      };

      const docRef = await addDoc(postsRef, newPost);
      return { id: docRef.id, ...newPost };
    } catch (err) {
      console.error('Error creating post:', err);
      throw new Error('Failed to create post');
    }
  };

  // Update a post
  const updatePost = async (postId, updatedData) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        throw new Error('Post not found');
      }

      const postData = postDoc.data();
      if (postData.userId !== user.uid) {
        throw new Error('Not authorized to update this post');
      }

      // Preserve existing image if no new image is provided
      const updateData = {
        ...updatedData,
        image: updatedData.image || postData.image,
        updatedAt: serverTimestamp()
      };

      await updateDoc(postRef, updateData);
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, ...updateData } : post
      ));
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  };

  // Delete a post
  const deletePost = async (postId) => {
    try {
      if (!user) throw new Error('User must be logged in to delete a post');

      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) throw new Error('Post not found');
      if (postDoc.data().userId !== user.uid) throw new Error('Not authorized to delete this post');

      // Delete all comments associated with the post
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);
      const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete the post
      await deleteDoc(postRef);
    } catch (err) {
      console.error('Error deleting post:', err);
      throw new Error('Failed to delete post');
    }
  };

  // Like/unlike a post
  const toggleLike = async (postId) => {
    try {
      if (!user) throw new Error('User must be logged in to like a post');

      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) throw new Error('Post not found');

      const postData = postDoc.data();
      const isLiked = postData.likes?.includes(user.uid);

      await updateDoc(postRef, {
        likes: isLiked
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error('Error toggling like:', err);
      throw new Error('Failed to like/unlike post');
    }
  };

  // Add a comment
  const addComment = async (postId, content) => {
    try {
      if (!user) throw new Error('User must be logged in to comment');

      const commentsRef = collection(db, 'posts', postId, 'comments');
      const newComment = {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        content,
        createdAt: serverTimestamp()
      };

      // Add the comment
      const docRef = await addDoc(commentsRef, newComment);

      // Update the comment count
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });

      return { id: docRef.id, ...newComment };
    } catch (err) {
      console.error('Error adding comment:', err);
      throw new Error('Failed to add comment');
    }
  };

  // Update a comment
  const updateComment = async (postId, commentId, content) => {
    try {
      if (!user) throw new Error('User must be logged in to update a comment');

      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (!commentDoc.exists()) throw new Error('Comment not found');
      if (commentDoc.data().userId !== user.uid) throw new Error('Not authorized to update this comment');

      const updateData = {
        content,
        updatedAt: serverTimestamp()
      };

      await updateDoc(commentRef, updateData);

      // Return the updated comment data
      return {
        id: commentId,
        ...commentDoc.data(),
        ...updateData
      };
    } catch (err) {
      console.error('Error updating comment:', err);
      throw new Error('Failed to update comment');
    }
  };

  // Delete a comment
  const deleteComment = async (postId, commentId) => {
    try {
      if (!user) throw new Error('User must be logged in to delete a comment');

      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (!commentDoc.exists()) throw new Error('Comment not found');
      if (commentDoc.data().userId !== user.uid) throw new Error('Not authorized to delete this comment');

      // Delete the comment
      await deleteDoc(commentRef);

      // Update the comment count
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1)
      });

      return true;
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw new Error('Failed to delete comment');
    }
  };

  // Get comments for a post
  const getComments = async (postId) => {
    try {
      console.log('Fetching comments for post:', postId);
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      // Get all comments
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Found comments:', comments);
      
      // For each comment, get its replies
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          try {
            const repliesRef = collection(db, 'posts', postId, 'comments', comment.id, 'replies');
            const repliesSnapshot = await getDocs(repliesRef);
            const replies = repliesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log(`Found ${replies.length} replies for comment ${comment.id}`);
            return {
              ...comment,
              replies: replies || []
            };
          } catch (err) {
            console.error(`Error fetching replies for comment ${comment.id}:`, err);
            return {
              ...comment,
              replies: []
            };
          }
        })
      );
      
      console.log('Comments with replies:', commentsWithReplies);
      return commentsWithReplies;
    } catch (err) {
      console.error('Error fetching comments:', err);
      throw new Error('Failed to fetch comments');
    }
  };

  // Add a reply to a comment
  const addReply = async (postId, commentId, content) => {
    try {
      if (!user) throw new Error('User must be logged in to reply');

      const repliesRef = collection(db, 'posts', postId, 'comments', commentId, 'replies');
      const newReply = {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        content,
        createdAt: serverTimestamp()
      };

      // Add the reply
      const docRef = await addDoc(repliesRef, newReply);

      return { id: docRef.id, ...newReply };
    } catch (err) {
      console.error('Error adding reply:', err);
      throw new Error('Failed to add reply');
    }
  };

  // Update a reply
  const updateReply = async (postId, commentId, replyId, content) => {
    try {
      if (!user) throw new Error('User must be logged in to update a reply');

      const replyRef = doc(db, 'posts', postId, 'comments', commentId, 'replies', replyId);
      const replyDoc = await getDoc(replyRef);
      
      if (!replyDoc.exists()) throw new Error('Reply not found');
      if (replyDoc.data().userId !== user.uid) throw new Error('Not authorized to update this reply');

      const updateData = {
        content,
        updatedAt: serverTimestamp()
      };

      await updateDoc(replyRef, updateData);

      // Return the updated reply data
      return {
        id: replyId,
        ...replyDoc.data(),
        ...updateData
      };
    } catch (err) {
      console.error('Error updating reply:', err);
      throw new Error('Failed to update reply');
    }
  };

  // Delete a reply
  const deleteReply = async (postId, commentId, replyId) => {
    try {
      if (!user) throw new Error('User must be logged in to delete a reply');

      const replyRef = doc(db, 'posts', postId, 'comments', commentId, 'replies', replyId);
      const replyDoc = await getDoc(replyRef);
      
      if (!replyDoc.exists()) throw new Error('Reply not found');
      if (replyDoc.data().userId !== user.uid) throw new Error('Not authorized to delete this reply');

      // Delete the reply
      await deleteDoc(replyRef);

      return true;
    } catch (err) {
      console.error('Error deleting reply:', err);
      throw new Error('Failed to delete reply');
    }
  };

  const value = {
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
    updateComment,
    deleteComment,
    getComments,
    addReply,
    updateReply,
    deleteReply
  };

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
}; 