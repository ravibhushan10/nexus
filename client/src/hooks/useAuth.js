import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { firebaseConfig, isFirebaseConfigured } from '../firebaseConfig.js'
import { useAuth as useAuthContext } from '../context/AuthContext.jsx'

const firebaseApp = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null

export { isFirebaseConfigured }

function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

function parseOAuthError(err, providerName) {
  if (
    err.code === 'auth/popup-closed-by-user' ||
    err.code === 'auth/cancelled-popup-request'
  ) return null
  if (!err) return null
  if (
    isOffline() ||
    err.code === 'auth/network-request-failed' ||
    err.message?.includes('Failed to fetch') ||
    err.message?.includes('NetworkError') ||
    err.message?.includes('net::ERR')
  ) {
    const e = new Error('No internet connection. Please check your network and try again.')
    e.friendlyMessage = e.message
    throw e
  }
  if (err.code === 'auth/popup-blocked') {
    const e = new Error('Popup was blocked. Please allow popups for this site and try again.')
    e.friendlyMessage = e.message
    throw e
  }
  if (err.response?.data) {
    const backendErr = new Error(err.response.data.message || `${providerName} sign-in failed.`)
    backendErr.friendlyMessage = backendErr.message
    backendErr.response        = err.response
    throw backendErr
  }
  const e = new Error(`${providerName} sign-in failed. Please try again.`)
  e.friendlyMessage = e.message
  throw e
}

export function useOAuth() {
  const { oauthLogin } = useAuthContext()

 const loginWithGoogle = async () => {
  if (!firebaseAuth) {
    const e = new Error('Google sign-in is not configured.')
    e.friendlyMessage = e.message
    throw e
  }
  if (isOffline()) {
    const e = new Error('No internet connection.')
    e.friendlyMessage = e.message
    throw e
  }
  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')           // ← explicitly request email scope
    provider.addScope('profile')
    provider.setCustomParameters({ prompt: 'select_account' })

    const result     = await signInWithPopup(firebaseAuth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const u          = result.user

    // Get email from every possible source
    const email =
      u.email ||
      u.providerData?.[0]?.email ||
      result._tokenResponse?.email ||
      result.user?.reloadUserInfo?.email ||
      null

    if (!email) {
      const e = new Error('No email found on your Google account.')
      e.friendlyMessage = e.message
      throw e
    }

    return await oauthLogin({
      name:          u.displayName || email,
      email,
      oauthProvider: 'google',
      oauthId:       u.uid,
      avatar:        u.photoURL || '',
    })
  } catch (err) {
    console.error('Google error:', err.code, err.message)
    return parseOAuthError(err, 'Google')
  }
}

  const loginWithGitHub = async () => {
    if (!firebaseAuth) {
      const e = new Error('GitHub sign-in is not configured.')
      e.friendlyMessage = e.message
      throw e
    }
    if (isOffline()) {
      const e = new Error('No internet connection.')
      e.friendlyMessage = e.message
      throw e
    }
    try {
      const provider = new GithubAuthProvider()
      provider.addScope('user:email')

      const result = await signInWithPopup(firebaseAuth, provider)
      const u      = result.user
      const email  =
        u.email ||
        u.providerData?.[0]?.email ||
        result._tokenResponse?.email ||
        null

      if (!email) {
        const e = new Error('No public email found on your GitHub account. Please add one in GitHub Settings → Profile.')
        e.friendlyMessage = e.message
        throw e
      }

      return await oauthLogin({
        name:          u.displayName || u.providerData?.[0]?.displayName || email,
        email,
        oauthProvider: 'github',
        oauthId:       u.uid,
        avatar:        u.photoURL || u.providerData?.[0]?.photoURL || '',
      })
    } catch (err) {
      console.error('GitHub error:', err.code, err.message)
      return parseOAuthError(err, 'GitHub')
    }
  }

  return { loginWithGoogle, loginWithGitHub }
}
