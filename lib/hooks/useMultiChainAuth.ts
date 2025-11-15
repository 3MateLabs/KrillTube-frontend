/**
 * useMultiChainAuth - Hook for multi-chain wallet signature-based authentication
 * Supports both Sui and IOTA wallets
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentAccount as useSuiAccount, useSignPersonalMessage as useSuiSignMessage } from '@mysten/dapp-kit';
import { useCurrentAccount as useIotaAccount, useSignPersonalMessage as useIotaSignMessage } from '@iota/dapp-kit';
import { useWalletContext } from '@/lib/context/WalletContext';
import Cookies from 'js-cookie';

const AUTH_MESSAGE = 'I am using Krill.Tube';
const SIGNATURE_COOKIE_NAME = 'signature';
const MESSAGE_COOKIE_NAME = 'signature_message';
const ADDRESS_COOKIE_NAME = 'signature_address';
const CHAIN_COOKIE_NAME = 'signature_chain';
const COOKIE_MAX_AGE_HOURS = 12;

export interface MultiChainAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  address: string | null;
  chain: 'sui' | 'iota' | null;
}

export function useMultiChainAuth() {
  const { chain: activeChain, address } = useWalletContext();
  const suiAccount = useSuiAccount();
  const iotaAccount = useIotaAccount();

  const { mutateAsync: signSuiMessage } = useSuiSignMessage();
  const { mutateAsync: signIotaMessage } = useIotaSignMessage();

  const [authState, setAuthState] = useState<MultiChainAuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    address: null,
    chain: null,
  });

  // Track if we've already requested a signature for this address
  const signatureRequestedRef = useRef<string | null>(null);
  const isFirstRenderRef = useRef(true);

  // Check if signature exists in cookies
  const checkAuthentication = useCallback(() => {
    if (!address || !activeChain) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        address: null,
        chain: null,
      });
      return false;
    }

    const signature = Cookies.get(SIGNATURE_COOKIE_NAME);
    const message = Cookies.get(MESSAGE_COOKIE_NAME);
    const storedChain = Cookies.get(CHAIN_COOKIE_NAME);

    // Verify signature matches current chain
    const isAuthenticated = !!(
      signature &&
      message &&
      storedChain === activeChain
    );

    setAuthState({
      isAuthenticated,
      isLoading: false,
      error: null,
      address,
      chain: activeChain,
    });

    return isAuthenticated;
  }, [address, activeChain]);

  // Request signature from user
  const requestSignature = useCallback(async () => {
    if (!address || !activeChain) {
      setAuthState(prev => ({
        ...prev,
        error: 'No wallet connected',
        isLoading: false,
      }));
      return false;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log(`[MultiChainAuth] Requesting ${activeChain} signature for:`, address);

      let result;
      const messageBytes = new TextEncoder().encode(AUTH_MESSAGE);

      if (activeChain === 'sui') {
        result = await signSuiMessage({ message: messageBytes });
      } else if (activeChain === 'iota') {
        result = await signIotaMessage({ message: messageBytes });
      } else {
        throw new Error(`Unsupported chain: ${activeChain}`);
      }

      console.log('[MultiChainAuth] Signature received:', result.signature);

      // Verify signature with backend
      const verifyResponse = await fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: AUTH_MESSAGE,
          signature: result.signature,
          address,
          chain: activeChain,
        }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.text();
        throw new Error(`Signature verification failed: ${error}`);
      }

      const verifyResult = await verifyResponse.json();
      console.log('[MultiChainAuth] Backend verification result:', verifyResult);

      if (!verifyResult.valid) {
        throw new Error('Invalid signature');
      }

      // Store in cookies (expires in 12 hours)
      const cookieOptions = {
        expires: COOKIE_MAX_AGE_HOURS / 24, // js-cookie uses days
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      Cookies.set(SIGNATURE_COOKIE_NAME, result.signature, cookieOptions);
      Cookies.set(MESSAGE_COOKIE_NAME, AUTH_MESSAGE, cookieOptions);
      Cookies.set(ADDRESS_COOKIE_NAME, address, cookieOptions);
      Cookies.set(CHAIN_COOKIE_NAME, activeChain, cookieOptions);

      console.log('[MultiChainAuth] ✓ Authentication successful');

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        address,
        chain: activeChain,
      });

      return true;
    } catch (error) {
      console.error('[MultiChainAuth] Signature request failed:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Signature request failed',
        isLoading: false,
      }));
      return false;
    }
  }, [address, activeChain, signSuiMessage, signIotaMessage]);

  // Main authentication effect
  useEffect(() => {
    console.log('[MultiChainAuth] useEffect triggered, address:', address);

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      console.log('[MultiChainAuth] First render, wallet initializing...');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    if (!address) {
      console.log('[MultiChainAuth] No wallet connected');
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        address: null,
        chain: null,
      });
      signatureRequestedRef.current = null;
      return;
    }

    // Check for existing signature
    const isAuth = checkAuthentication();

    if (isAuth) {
      console.log('[MultiChainAuth] Found existing signature, verifying with backend...');

      // Verify existing signature with backend
      const signature = Cookies.get(SIGNATURE_COOKIE_NAME);
      const message = Cookies.get(MESSAGE_COOKIE_NAME);

      fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          address,
          chain: activeChain,
        }),
      })
        .then(res => res.json())
        .then(result => {
          console.log('[MultiChainAuth] Backend verification result for existing signature:', result);
          if (result.valid) {
            console.log('[MultiChainAuth] ✓✓ Existing signature verified successfully!');
          } else {
            console.log('[MultiChainAuth] Existing signature invalid, requesting new one...');
            requestSignature();
          }
        })
        .catch(err => {
          console.error('[MultiChainAuth] Verification error:', err);
        });

      return;
    }

    // Request new signature
    if (signatureRequestedRef.current !== address) {
      console.log('[MultiChainAuth] No existing signature, requesting new one...');
      signatureRequestedRef.current = address;
      requestSignature();
    }
  }, [address, activeChain, checkAuthentication, requestSignature]);

  return authState;
}
