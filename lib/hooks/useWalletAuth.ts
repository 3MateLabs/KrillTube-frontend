/**
 * useWalletAuth - Hook for wallet signature-based authentication
 *
 * After connecting wallet, prompts user to sign a message for authentication.
 * Stores signature in cookies for 12 hours.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import Cookies from 'js-cookie';

const AUTH_MESSAGE = 'I am using Krill.Tube';
const SIGNATURE_COOKIE_NAME = 'signature';
const MESSAGE_COOKIE_NAME = 'signature_message';
const ADDRESS_COOKIE_NAME = 'signature_address';
const COOKIE_MAX_AGE_HOURS = 12;

export interface WalletAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  address: string | null;
}

export function useWalletAuth() {
  const currentAccount = useCurrentAccount();
  console.log('[useWalletAuth] Current account:', currentAccount);
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [authState, setAuthState] = useState<WalletAuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    address: null,
  });

  // Track if we've already requested a signature for this address
  const signatureRequestedRef = useRef<string | null>(null);

  // Track if this is the first render (wallet initializing)
  const isFirstRenderRef = useRef(true);

  // Check if signature exists in cookies
  const checkAuthentication = useCallback(() => {
    if (!currentAccount?.address) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        address: null,
      });
      return false;
    }

    const signature = Cookies.get(SIGNATURE_COOKIE_NAME);
    const message = Cookies.get(MESSAGE_COOKIE_NAME);

    const isAuthenticated = !!(signature && message);

    setAuthState({
      isAuthenticated,
      isLoading: false,
      error: null,
      address: currentAccount.address,
    });

    return isAuthenticated;
  }, [currentAccount?.address]);

  // Request signature from user
  const requestSignature = useCallback(async () => {
    if (!currentAccount?.address) {
      setAuthState(prev => ({
        ...prev,
        error: 'No wallet connected',
        isLoading: false,
      }));
      return false;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[WalletAuth] Requesting signature for:', currentAccount.address);

      // Request signature from wallet
      const result = await signPersonalMessage({
        message: new TextEncoder().encode(AUTH_MESSAGE),
      });

      console.log('[WalletAuth] Signature received:', result.signature);

      // Store in cookies (expires in 12 hours)
      const cookieOptions = {
        expires: COOKIE_MAX_AGE_HOURS / 24, // js-cookie uses days
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      Cookies.set(SIGNATURE_COOKIE_NAME, result.signature, cookieOptions);
      Cookies.set(MESSAGE_COOKIE_NAME, AUTH_MESSAGE, cookieOptions);
      Cookies.set(ADDRESS_COOKIE_NAME, currentAccount.address, cookieOptions);

      console.log('[WalletAuth] ✓ Signature stored in cookies, verifying with backend...');

      // Verify signature with backend
      try {
        const verifyResponse = await fetch('/api/test/signature_verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!verifyResponse.ok) {
          console.error('[WalletAuth] Backend verification failed:', verifyResponse.statusText);
          const errorData = await verifyResponse.json();
          console.error('[WalletAuth] Verification error details:', errorData);

          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Signature verification failed',
            address: currentAccount.address,
          });
          return false;
        }

        const verifyData = await verifyResponse.json();
        console.log('[WalletAuth] Backend verification result:', verifyData);

        if (verifyData.verified) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            address: currentAccount.address,
          });
          console.log('[WalletAuth] ✓✓ Signature verified successfully with backend!');
          return true;
        } else {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Backend verification failed',
            address: currentAccount.address,
          });
          console.error('[WalletAuth] Backend verification returned false');
          return false;
        }
      } catch (verifyError) {
        console.error('[WalletAuth] Backend verification error:', verifyError);
        // Still set as authenticated locally, verification can be retried later
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          address: currentAccount.address,
        });
        console.warn('[WalletAuth] Proceeding with local authentication (verification failed)');
        return true;
      }
    } catch (error) {
      console.error('[WalletAuth] Failed to sign message:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sign message',
        address: currentAccount.address,
      });
      return false;
    }
  }, [currentAccount?.address, signPersonalMessage]);

  // Verify signature with backend
  const verifySignature = useCallback(async (): Promise<boolean> => {
    if (!currentAccount?.address) return false;

    const signature = Cookies.get(SIGNATURE_COOKIE_NAME);
    if (!signature) return false;

    try {
      // Cookies are sent automatically with the request
      const response = await fetch('/api/test/signature_verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('[WalletAuth] Verification failed:', response.statusText);
        return false;
      }

      const data = await response.json();
      console.log('[WalletAuth] Verification result:', data);

      return data.verified === true;
    } catch (error) {
      console.error('[WalletAuth] Verification error:', error);
      return false;
    }
  }, [currentAccount?.address]);

  // Clear authentication
  const clearAuth = useCallback(() => {
    Cookies.remove(SIGNATURE_COOKIE_NAME);
    Cookies.remove(MESSAGE_COOKIE_NAME);
    Cookies.remove(ADDRESS_COOKIE_NAME);
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      address: null,
    });
    console.log('[WalletAuth] Authentication cleared');
  }, []);

  // Auto-check authentication on wallet change
  useEffect(() => {
    console.log('[WalletAuth] useEffect triggered, address:', currentAccount?.address);

    if (!currentAccount?.address) {
      // Check if cookies exist - if they do, wallet might still be initializing
      const storedAddress = Cookies.get(ADDRESS_COOKIE_NAME);

      if (storedAddress && isFirstRenderRef.current) {
        console.log('[WalletAuth] Wallet initializing, cookies exist for:', storedAddress);
        // Don't clear cookies yet, wallet might still be connecting
        setAuthState({
          isAuthenticated: false,
          isLoading: true, // Keep loading state
          error: null,
          address: null,
        });
        isFirstRenderRef.current = false;
        return;
      }

      // If it's not the first render and there's no account, user has disconnected
      if (!isFirstRenderRef.current) {
        console.log('[WalletAuth] Wallet disconnected, clearing auth');
        Cookies.remove(SIGNATURE_COOKIE_NAME);
        Cookies.remove(MESSAGE_COOKIE_NAME);
        Cookies.remove(ADDRESS_COOKIE_NAME);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          address: null,
        });
        signatureRequestedRef.current = null;
      } else {
        // First render, no cookies, no account
        console.log('[WalletAuth] Initial state, no wallet connected');
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          address: null,
        });
        isFirstRenderRef.current = false;
      }
      return;
    }

    // Mark that we've seen an account (no longer first render)
    isFirstRenderRef.current = false;

    // Check if signature exists in cookies
    const signature = Cookies.get(SIGNATURE_COOKIE_NAME);
    const message = Cookies.get(MESSAGE_COOKIE_NAME);
    const storedAddress = Cookies.get(ADDRESS_COOKIE_NAME);

    console.log('[WalletAuth] Auth check:', {
      signature: !!signature,
      message: !!message,
      storedAddress,
      currentAddress: currentAccount.address,
      addressMatch: storedAddress === currentAccount.address,
    });

    // If address in cookies doesn't match current address, clear everything
    if (storedAddress && storedAddress !== currentAccount.address) {
      console.log('[WalletAuth] Address mismatch! Clearing old signature and requesting new one');
      Cookies.remove(SIGNATURE_COOKIE_NAME);
      Cookies.remove(MESSAGE_COOKIE_NAME);
      Cookies.remove(ADDRESS_COOKIE_NAME);
      signatureRequestedRef.current = null;
      // Continue to request new signature below
    }

    const isAuthenticated = !!(signature && message && storedAddress === currentAccount.address);

    if (isAuthenticated) {
      console.log('[WalletAuth] Found existing signature, verifying with backend...');
      signatureRequestedRef.current = currentAccount.address;

      // Verify existing signature with backend
      (async () => {
        try {
          const verifyResponse = await fetch('/api/test/signature_verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!verifyResponse.ok) {
            console.error('[WalletAuth] Backend verification failed for existing signature');
            const errorData = await verifyResponse.json();
            console.error('[WalletAuth] Verification error details:', errorData);

            // Clear invalid cookies and request new signature
            Cookies.remove(SIGNATURE_COOKIE_NAME);
            Cookies.remove(MESSAGE_COOKIE_NAME);
            Cookies.remove(ADDRESS_COOKIE_NAME);
            signatureRequestedRef.current = null;

            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              error: 'Stored signature verification failed',
              address: currentAccount.address,
            });
            return;
          }

          const verifyData = await verifyResponse.json();
          console.log('[WalletAuth] Backend verification result for existing signature:', verifyData);

          if (verifyData.verified) {
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              address: currentAccount.address,
            });
            console.log('[WalletAuth] ✓✓ Existing signature verified successfully!');
          } else {
            console.error('[WalletAuth] Backend verification returned false for existing signature');
            // Clear invalid cookies
            Cookies.remove(SIGNATURE_COOKIE_NAME);
            Cookies.remove(MESSAGE_COOKIE_NAME);
            Cookies.remove(ADDRESS_COOKIE_NAME);
            signatureRequestedRef.current = null;

            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              error: 'Stored signature is invalid',
              address: currentAccount.address,
            });
          }
        } catch (verifyError) {
          console.error('[WalletAuth] Backend verification error for existing signature:', verifyError);
          // Proceed with local authentication if backend verification fails
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            address: currentAccount.address,
          });
          console.warn('[WalletAuth] Proceeding with local authentication (backend verification failed)');
        }
      })();
      return;
    }

    // If not authenticated and we haven't requested for this address yet
    if (!isAuthenticated && signatureRequestedRef.current !== currentAccount.address) {
      console.log('[WalletAuth] Not authenticated, requesting signature...');
      signatureRequestedRef.current = currentAccount.address;

      // Request signature
      (async () => {
        try {
          setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

          console.log('[WalletAuth] Requesting signature for:', currentAccount.address);
          const result = await signPersonalMessage({
            message: new TextEncoder().encode(AUTH_MESSAGE),
          });

          console.log('[WalletAuth] Signature received:', result.signature);

          // Store in cookies (expires in 12 hours)
          const cookieOptions = {
            expires: COOKIE_MAX_AGE_HOURS / 24,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
          };

          Cookies.set(SIGNATURE_COOKIE_NAME, result.signature, cookieOptions);
          Cookies.set(MESSAGE_COOKIE_NAME, AUTH_MESSAGE, cookieOptions);
          Cookies.set(ADDRESS_COOKIE_NAME, currentAccount.address, cookieOptions);

          console.log('[WalletAuth] ✓ Signature stored in cookies, verifying with backend...');

          // Verify signature with backend
          try {
            const verifyResponse = await fetch('/api/test/signature_verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!verifyResponse.ok) {
              console.error('[WalletAuth] Backend verification failed:', verifyResponse.statusText);
              const errorData = await verifyResponse.json();
              console.error('[WalletAuth] Verification error details:', errorData);

              setAuthState({
                isAuthenticated: false,
                isLoading: false,
                error: 'Signature verification failed',
                address: currentAccount.address,
              });
              return;
            }

            const verifyData = await verifyResponse.json();
            console.log('[WalletAuth] Backend verification result:', verifyData);

            if (verifyData.verified) {
              setAuthState({
                isAuthenticated: true,
                isLoading: false,
                error: null,
                address: currentAccount.address,
              });
              console.log('[WalletAuth] ✓✓ Signature verified successfully with backend!');
            } else {
              setAuthState({
                isAuthenticated: false,
                isLoading: false,
                error: 'Backend verification failed',
                address: currentAccount.address,
              });
              console.error('[WalletAuth] Backend verification returned false');
            }
          } catch (verifyError) {
            console.error('[WalletAuth] Backend verification error:', verifyError);
            // Still set as authenticated locally, verification can be retried later
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              address: currentAccount.address,
            });
            console.warn('[WalletAuth] Proceeding with local authentication (verification failed)');
          }
        } catch (error) {
          console.error('[WalletAuth] Failed to sign message:', error);
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to sign message',
            address: currentAccount.address,
          });
          // Reset the ref so user can try again
          signatureRequestedRef.current = null;
        }
      })();
    } else if (!isAuthenticated) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        address: currentAccount.address,
      });
    }
  }, [currentAccount?.address, signPersonalMessage]);

  return {
    ...authState,
    requestSignature,
    verifySignature,
    clearAuth,
    checkAuthentication,
  };
}
