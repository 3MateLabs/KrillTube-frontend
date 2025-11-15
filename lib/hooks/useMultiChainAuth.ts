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
    const storedAddress = Cookies.get(ADDRESS_COOKIE_NAME);

    // Verify signature matches current chain and address
    const isAuthenticated = !!(
      signature &&
      message &&
      storedChain === activeChain &&
      storedAddress === address
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
      let result;
      let signature: string;
      const messageBytes = new TextEncoder().encode(AUTH_MESSAGE);

      if (activeChain === 'sui') {
        result = await signSuiMessage({ message: messageBytes });
        signature = result.signature;
      } else if (activeChain === 'iota') {
        if (!iotaAccount) {
          throw new Error('IOTA account not found');
        }
        result = await signIotaMessage({
          message: messageBytes,
          account: iotaAccount
        });
        signature = result.signature;
      } else {
        throw new Error(`Unsupported chain: ${activeChain}`);
      }

      // Verify signature with backend
      const verifyResponse = await fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: AUTH_MESSAGE,
          signature: signature,
          address,
          chain: activeChain,
        }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.text();
        throw new Error(`Signature verification failed: ${error}`);
      }

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.valid) {
        throw new Error('Invalid signature');
      }

      // Store in cookies (expires in 12 hours)
      const cookieOptions = {
        expires: COOKIE_MAX_AGE_HOURS / 24, // js-cookie uses days
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      Cookies.set(SIGNATURE_COOKIE_NAME, signature, cookieOptions);
      Cookies.set(MESSAGE_COOKIE_NAME, AUTH_MESSAGE, cookieOptions);
      Cookies.set(ADDRESS_COOKIE_NAME, address, cookieOptions);
      Cookies.set(CHAIN_COOKIE_NAME, activeChain, cookieOptions);

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
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      setAuthState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    if (!address) {
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
          if (!result.valid) {
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
      signatureRequestedRef.current = address;
      requestSignature();
    }
  }, [address, activeChain, checkAuthentication, requestSignature]);

  return authState;
}
