/**
 * Authentication Utilities for Load Tests
 *
 * Handles Supabase authentication for k6 load tests.
 */

import http from 'k6/http'
import { check } from 'k6'
import { config } from '../config.js'

/**
 * Authenticate a user and return access token
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string|null} Access token or null if auth failed
 */
export function authenticateUser(email, password) {
  const payload = JSON.stringify({
    email,
    password,
    gotrue_meta_security: {},
  })

  const response = http.post(
    `${config.supabase.url}/auth/v1/token?grant_type=password`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabase.anonKey,
      },
    }
  )

  const success = check(response, {
    'auth successful': (r) => r.status === 200,
    'access token received': (r) => {
      try {
        const body = JSON.parse(r.body)
        return !!body.access_token
      } catch {
        return false
      }
    },
  })

  if (success && response.status === 200) {
    try {
      const body = JSON.parse(response.body)
      return body.access_token
    } catch (error) {
      console.error('Failed to parse auth response:', error)
      return null
    }
  }

  return null
}

/**
 * Get Supabase headers with auth token
 *
 * @param {string} accessToken - JWT access token
 * @returns {object} Headers object
 */
export function getSupabaseHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    'apikey': config.supabase.anonKey,
    'Authorization': `Bearer ${accessToken}`,
  }
}

/**
 * Create a test user session and return auth data
 * This should be called in the setup() function to avoid
 * rate limiting during the test.
 *
 * @param {object} user - User credentials {email, password}
 * @returns {object} Auth data {email, accessToken}
 */
export function setupUserSession(user) {
  const accessToken = authenticateUser(user.email, user.password)

  if (!accessToken) {
    throw new Error(`Failed to authenticate user: ${user.email}`)
  }

  return {
    email: user.email,
    accessToken,
  }
}

/**
 * Setup multiple user sessions for parallel testing
 *
 * @returns {Array} Array of auth data objects
 */
export function setupMultipleUserSessions() {
  return config.testUsers.map((user) => setupUserSession(user))
}

/**
 * Get a random user session from pre-authenticated users
 *
 * @param {Array} userSessions - Array of user session objects
 * @returns {object} Random user session
 */
export function getRandomUserSession(userSessions) {
  return userSessions[Math.floor(Math.random() * userSessions.length)]
}
