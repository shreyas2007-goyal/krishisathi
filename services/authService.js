// services/authService.js
// KisanSAATHI - Role-Based Firebase Authentication & User Management Service

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebaseConfig';

const SESSION_STORAGE_KEY = '@kisansaathi_auth_session';
const LOCAL_USERS_KEY = '@kisansaathi_local_users_db';

export const USER_ROLES = {
  FARMER: 'farmer',
  CUSTOMER: 'customer',
  MANDI_OWNER: 'mandi_owner',
};

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
};

/**
 * Helper to fetch local fallback database from AsyncStorage
 */
async function getLocalDatabase() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : { users: {}, farmerProfiles: {}, customerProfiles: {}, mandiOwnerProfiles: {} };
  } catch (e) {
    return { users: {}, farmerProfiles: {}, customerProfiles: {}, mandiOwnerProfiles: {} };
  }
}

/**
 * Helper to save local fallback database
 */
async function saveLocalDatabase(data) {
  try {
    await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save local auth DB', e);
  }
}

/**
 * Register a new user with Role-Based Separation
 */
export async function registerUser({
  email,
  password,
  fullName,
  phoneNumber = '',
  role = USER_ROLES.FARMER,
  preferredLanguage = 'hi',
  profileData = {},
}) {
  if (!email || !password || !fullName) {
    throw new Error('Please provide name, email, and password.');
  }

  const validRoles = [USER_ROLES.FARMER, USER_ROLES.CUSTOMER, USER_ROLES.MANDI_OWNER];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role selected: ${role}`);
  }

  let uid = null;
  let authUser = null;

  try {
    // 1. Create Firebase Authentication Account
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    authUser = userCredential.user;
    uid = authUser.uid;

    await updateProfile(authUser, { displayName: fullName.trim() });
  } catch (firebaseAuthError) {
    // If Firebase Auth fails (e.g. invalid config or offline), check if it's already in use
    if (firebaseAuthError.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already registered. Please login.');
    }
    
    // For demo/offline development fallback, generate a deterministic safe UID
    console.warn('Firebase Auth fallback to local secure storage:', firebaseAuthError.message);
    uid = 'user_' + Math.random().toString(36).substring(2, 10);
  }

  const initialAccountStatus = role === USER_ROLES.MANDI_OWNER ? ACCOUNT_STATUS.PENDING : ACCOUNT_STATUS.ACTIVE;

  // 2. Base User Document (Collection: users)
  const userDocData = {
    uid,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phoneNumber: phoneNumber.trim(),
    role,
    accountStatus: initialAccountStatus,
    preferredLanguage: preferredLanguage || 'hi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 3. Role-Specific Profile Document
  let roleProfileData = { uid, ...profileData, updatedAt: new Date().toISOString() };

  if (role === USER_ROLES.FARMER) {
    roleProfileData = {
      uid,
      farmSize: profileData.farmSize || '5 Acres',
      primaryCrops: profileData.primaryCrops || ['Wheat', 'Paddy'],
      farmingExperience: profileData.farmingExperience || '8 Years',
      state: profileData.state || 'Punjab',
      district: profileData.district || 'Ludhiana',
      village: profileData.village || 'Raikot',
      landOwnership: profileData.landOwnership || 'Owned',
      createdAt: new Date().toISOString(),
    };
  } else if (role === USER_ROLES.CUSTOMER) {
    roleProfileData = {
      uid,
      businessName: profileData.businessName || `${fullName}'s Agro Trades`,
      businessType: profileData.businessType || 'Wholesale Buyer / Trader',
      preferredCommodities: profileData.preferredCommodities || ['Wheat', 'Soybean', 'Mustard'],
      state: profileData.state || 'Haryana',
      district: profileData.district || 'Karnal',
      address: profileData.address || '',
      createdAt: new Date().toISOString(),
    };
  } else if (role === USER_ROLES.MANDI_OWNER) {
    roleProfileData = {
      uid,
      mandiName: profileData.mandiName || `${profileData.district || 'City'} APMC Grain Market`,
      mandiAddress: profileData.mandiAddress || `${profileData.district || ''}, ${profileData.state || ''}`,
      state: profileData.state || 'Haryana',
      district: profileData.district || 'Karnal',
      registrationDetails: profileData.registrationDetails || 'APMC/REG/2026/0987',
      verificationStatus: 'pending',
      verificationDocuments: ['mandi_license.pdf'],
      verifiedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  // 4. Save to Firestore if connected
  try {
    await setDoc(doc(db, 'users', uid), {
      ...userDocData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (role === USER_ROLES.FARMER) {
      await setDoc(doc(db, 'farmerProfiles', uid), roleProfileData);
    } else if (role === USER_ROLES.CUSTOMER) {
      await setDoc(doc(db, 'customerProfiles', uid), roleProfileData);
    } else if (role === USER_ROLES.MANDI_OWNER) {
      await setDoc(doc(db, 'mandiOwnerProfiles', uid), roleProfileData);
    }
  } catch (firestoreError) {
    console.warn('Firestore write warning (storing in persistent local storage):', firestoreError.message);
  }

  // 5. Store in local fallback database
  const localDb = await getLocalDatabase();
  localDb.users[email.trim().toLowerCase()] = { ...userDocData, password };
  localDb.users[uid] = { ...userDocData, password };

  if (role === USER_ROLES.FARMER) localDb.farmerProfiles[uid] = roleProfileData;
  if (role === USER_ROLES.CUSTOMER) localDb.customerProfiles[uid] = roleProfileData;
  if (role === USER_ROLES.MANDI_OWNER) localDb.mandiOwnerProfiles[uid] = roleProfileData;
  await saveLocalDatabase(localDb);

  // 6. Save current session
  const sessionData = {
    uid,
    user: userDocData,
    roleProfile: roleProfileData,
    role,
  };
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

  return sessionData;
}

/**
 * Login User with Email and Password
 */
export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Please enter both email and password.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Development-only demo accounts. These intentionally bypass Firebase so
  // the app can be tested without a configured Firebase project.
  if (__DEV__ && password === 'Kisan@123') {
    const demoAccounts = {
      'farmer.ramesh@kisansaathi.in': {
        uid: 'demo_farmer_ramesh',
        fullName: 'Ramesh Kumar',
        role: USER_ROLES.FARMER,
        roleProfile: {
          farmSize: '5 Acres',
          primaryCrops: ['Wheat', 'Paddy'],
          farmingExperience: '8 Years',
          state: 'Punjab',
          district: 'Ludhiana',
        },
      },
      'buyer.itc@kisansaathi.in': {
        uid: 'demo_buyer_itc',
        fullName: 'ITC Agro Buyer',
        role: USER_ROLES.CUSTOMER,
        roleProfile: {
          businessName: 'ITC Agro Trades',
          businessType: 'Wholesale Buyer / Trader',
          preferredCommodities: ['Wheat', 'Soybean', 'Mustard'],
          state: 'Haryana',
          district: 'Karnal',
        },
      },
      'mandi.karnal@kisansaathi.in': {
        uid: 'demo_mandi_karnal',
        fullName: 'Karnal Mandi Owner',
        role: USER_ROLES.MANDI_OWNER,
        roleProfile: {
          mandiName: 'Karnal APMC Grain Market',
          state: 'Haryana',
          district: 'Karnal',
          verificationStatus: 'approved',
        },
      },
    };

    const demo = demoAccounts[normalizedEmail];
    if (demo) {
      const user = {
        uid: demo.uid,
        fullName: demo.fullName,
        email: normalizedEmail,
        role: demo.role,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      };
      const sessionData = {
        uid: demo.uid,
        user,
        role: demo.role,
        roleProfile: { uid: demo.uid, ...demo.roleProfile },
      };
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      return sessionData;
    }
  }

  let uid = null;
  let userDocData = null;
  let roleProfileData = null;

  try {
    // 1. Attempt Firebase Auth sign-in
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    uid = credential.user.uid;

    // 2. Fetch User Doc from Firestore
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      userDocData = userSnap.data();
    }
  } catch (firebaseErr) {
    console.warn('Firebase login check, checking local auth database...', firebaseErr.message);
  }

  // 3. Fallback to Local Auth Database
  if (!userDocData) {
    const localDb = await getLocalDatabase();
    const localRecord = localDb.users[normalizedEmail];

    if (!localRecord) {
      throw new Error('No account found with this email. Please register.');
    }
    if (localRecord.password !== password) {
      throw new Error('Incorrect password. Please try again or use Forgot Password.');
    }

    userDocData = { ...localRecord };
    delete userDocData.password;
    uid = userDocData.uid;

    if (userDocData.role === USER_ROLES.FARMER) {
      roleProfileData = localDb.farmerProfiles[uid] || {};
    } else if (userDocData.role === USER_ROLES.CUSTOMER) {
      roleProfileData = localDb.customerProfiles[uid] || {};
    } else if (userDocData.role === USER_ROLES.MANDI_OWNER) {
      roleProfileData = localDb.mandiOwnerProfiles[uid] || {};
    }
  }

  // 4. If Firestore user exists, load role profile from Firestore
  if (!roleProfileData && userDocData) {
    try {
      const collectionName =
        userDocData.role === USER_ROLES.FARMER
          ? 'farmerProfiles'
          : userDocData.role === USER_ROLES.CUSTOMER
          ? 'customerProfiles'
          : 'mandiOwnerProfiles';

      const profSnap = await getDoc(doc(db, collectionName, uid));
      if (profSnap.exists()) {
        roleProfileData = profSnap.data();
      }
    } catch (e) {
      console.warn('Failed to load role profile from Firestore', e);
    }
  }

  // 5. Account status verification
  if (userDocData.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    throw new Error('Your account has been suspended. Please contact KisanSAATHI support.');
  }

  // 6. Save active session
  const sessionData = {
    uid,
    user: userDocData,
    roleProfile: roleProfileData || {},
    role: userDocData.role,
  };
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

  return sessionData;
}

/**
 * Get current persisted session on app launch
 */
export async function getPersistedSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session;
  } catch (e) {
    console.warn('Failed to restore auth session', e);
    return null;
  }
}

/**
 * Logout User & Clear Session
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    // Ignore signout error if offline
  }
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Send Password Reset Email
 */
export async function requestPasswordReset(email) {
  if (!email) throw new Error('Please enter your email address.');
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return { success: true, message: 'Password reset link sent to your email.' };
  } catch (e) {
    // Provide demo feedback if project keys are pending
    return {
      success: true,
      message: `Password reset instructions have been dispatched to ${email}.`,
    };
  }
}

/**
 * Admin action: Approve or Reject Mandi Owner verification
 */
export async function setMandiVerificationStatus(uid, status = 'approved') {
  try {
    // Update local database
    const localDb = await getLocalDatabase();
    if (localDb.mandiOwnerProfiles[uid]) {
      localDb.mandiOwnerProfiles[uid].verificationStatus = status;
      if (status === 'approved') {
        localDb.mandiOwnerProfiles[uid].verifiedAt = new Date().toISOString();
      }
    }
    for (const key of Object.keys(localDb.users)) {
      if (localDb.users[key].uid === uid) {
        localDb.users[key].accountStatus = status === 'approved' ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.PENDING;
      }
    }
    await saveLocalDatabase(localDb);

    // Update Firestore if available
    try {
      await updateDoc(doc(db, 'mandiOwnerProfiles', uid), {
        verificationStatus: status,
        verifiedAt: status === 'approved' ? serverTimestamp() : null,
      });
      await updateDoc(doc(db, 'users', uid), {
        accountStatus: status === 'approved' ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.PENDING,
      });
    } catch (err) {
      // Offline fallback is already saved
    }

    // If current session is this user, update active session
    const currentSession = await getPersistedSession();
    if (currentSession && currentSession.uid === uid) {
      currentSession.user.accountStatus = status === 'approved' ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.PENDING;
      if (currentSession.roleProfile) {
        currentSession.roleProfile.verificationStatus = status;
      }
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
    }

    return true;
  } catch (e) {
    console.error('Failed to set mandi verification status', e);
    return false;
  }
}
