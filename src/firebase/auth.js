import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth, db } from './config';
import { addDocument, getDocuments, createUser, updateUser, getUser } from './firestore';
import { doc, updateDoc } from 'firebase/firestore';

// Google provider
const googleProvider = new GoogleAuthProvider();

// Sign up new user with email/password
export const signup = async (email, password, username, bio) => {
  try {
    // Create the user in Firebase Auth first
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update auth profile
    await updateProfile(user, { displayName: username });
    
    // Try to create user profile in Firestore, but don't fail if it doesn't work
    try {
      // Create user profile in Firestore
      const userData = {
        uid: user.uid,
        username,
        email,
        bio,
        photoURL: null,
        createdAt: new Date(),
        friends: [],
        incomingRequests: [],
        outgoingRequests: [],
        onlineStatus: true,
        lastSeen: new Date(),
        updatedAt: new Date()
      };
      
      await createUser(userData);
    } catch (firestoreError) {
      console.warn('Could not create Firestore user document:', firestoreError);
      // Continue even if Firestore document creation fails
    }
    
    return user;
  } catch (error) {
    throw handleAuthError(error);
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign-in process...');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log('Google sign-in successful:', user.uid);

    // Try to check if user exists in Firestore, but don't fail if it doesn't work
    try {
      const existingUser = await getUser(user.uid);
      
      if (!existingUser) {
        console.log('Creating new user document...');
        // Create new user document with all specified fields
        const userData = {
          uid: user.uid,
          username: user.displayName || user.email.split('@')[0],
          email: user.email,
          bio: '',
          photoURL: user.photoURL || null,
          onlineStatus: true,
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await createUser(userData);
        console.log('New user document created successfully');
      } else {
        console.log('Updating existing user document...');
        // Update existing user document with current information
        const userData = {
          username: user.displayName || existingUser.username,
          email: user.email,
          photoURL: user.photoURL || existingUser.photoURL,
          onlineStatus: true,
          lastSeen: new Date(),
          updatedAt: new Date()
        };
        
        await updateUser(user.uid, userData);
        console.log('Existing user document updated successfully');
      }
    } catch (firestoreError) {
      console.warn('Firestore operation failed:', firestoreError);
      // Continue even if Firestore operations fail
    }

    return user;
  } catch (error) {
    console.error('Error during Google sign-in:', error);
    throw error;
  }
};

// Sign in existing user
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Try to update user status in Firestore, but don't fail if it doesn't work
    try {
      // Check if user exists in Firestore
      const userExists = await checkUserExists(user.uid);
      
      if (!userExists) {
        // Create user profile if it doesn't exist
        await createUserProfile(user.uid, {
          username: user.displayName || user.email.split('@')[0],
          email: user.email,
          bio: '',
          photoURL: user.photoURL,
          createdAt: new Date(),
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
          onlineStatus: true,
          lastSeen: new Date()
        });
      } else {
        // Update existing user's last seen and online status
        await updateUserStatus(user.uid);
      }
    } catch (firestoreError) {
      console.warn('Firestore operation failed during login:', firestoreError);
      // Continue even if Firestore operations fail
    }
    
    return user;
  } catch (error) {
    throw handleAuthError(error);
  }
};

// Sign out current user
export const logout = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      try {
        // Try to update user status before signing out
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          onlineStatus: false,
          lastSeen: new Date(),
          updatedAt: new Date()
        });
        console.log('User online status updated to offline');
      } catch (updateError) {
        // If the user document doesn't exist, just log the error and continue
        console.warn('User document not found during logout:', updateError);
      }
    }
    // Clear any existing auth state
    await firebaseSignOut(auth);
    // Force a clean state
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Create user profile in Firestore
const createUserProfile = async (uid, userData) => {
  try {
    await addDocument('users', {
      ...userData,
      uid
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Update user's online status and last seen
const updateUserStatus = async (uid, isOnline = true) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      onlineStatus: isOnline,
      lastSeen: new Date()
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Check if user exists in Firestore
const checkUserExists = async (uid) => {
  try {
    const users = await getDocuments('users', [
      { field: 'uid', operator: '==', value: uid }
    ]);
    return users.length > 0;
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw error;
  }
};

// Error handling helper
const handleAuthError = (error) => {
  let errorMessage = 'An error occurred during authentication.';
  
  switch (error.code) {
    case 'auth/email-already-in-use':
      errorMessage = 'Email is already in use.';
      break;
    case 'auth/invalid-email':
      errorMessage = 'Invalid email address.';
      break;
    case 'auth/operation-not-allowed':
      errorMessage = 'Operation not allowed.';
      break;
    case 'auth/weak-password':
      errorMessage = 'Password is too weak.';
      break;
    case 'auth/user-disabled':
      errorMessage = 'This account has been disabled.';
      break;
    case 'auth/user-not-found':
      errorMessage = 'No account found with this email.';
      break;
    case 'auth/wrong-password':
      errorMessage = 'Incorrect password.';
      break;
    case 'auth/popup-closed-by-user':
      errorMessage = 'Sign in was cancelled.';
      break;
    case 'auth/cancelled-popup-request':
      errorMessage = 'Sign in was cancelled.';
      break;
  }
  
  return new Error(errorMessage);
}; 