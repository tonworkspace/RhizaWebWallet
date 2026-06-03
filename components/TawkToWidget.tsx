import React, { useEffect } from 'react';
import { useWallet } from '../context/WalletContext';

/**
 * Tawk.to Live Chat Widget Component
 * 
 * Integrates Tawk.to live chat support into the application.
 * Automatically sets user information when logged in.
 * 
 * Features:
 * - Auto-loads Tawk.to script
 * - Sets user name and email when available
 * - Adds custom attributes (wallet address, network)
 * - Cleans up on unmount
 */

// Extend Window interface to include Tawk_API
declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

const TawkToWidget: React.FC = () => {
  const { userProfile, address, network, isLoggedIn } = useWallet();

  useEffect(() => {
    // Tawk.to Property ID and Widget ID from your script
    const TAWK_PROPERTY_ID = '69f623dc0a739d1c3418fe79';
    const TAWK_WIDGET_ID = '1jnkno613';

    // Initialize Tawk_API if not already present
    if (!window.Tawk_API) {
      window.Tawk_API = {};
      window.Tawk_LoadStart = new Date();
    }

    // Check if script is already loaded
    const existingScript = document.getElementById('tawk-to-script');
    if (existingScript) {
      // Script already loaded, just update user info
      updateTawkUserInfo();
      return;
    }

    // Create and inject Tawk.to script
    const script = document.createElement('script');
    script.id = 'tawk-to-script';
    script.async = true;
    script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    // Add script to document
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }

    // Set up onLoad callback to update user info and hide widget by default
    script.onload = () => {
      updateTawkUserInfo();
      // Hide the Tawk.to widget by default (will be shown by UnifiedSupportWidget)
      if (window.Tawk_API && window.Tawk_API.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };

    // Cleanup function
    return () => {
      // Note: We don't remove the script on unmount to prevent re-loading
      // Tawk.to persists across page navigation in SPAs
    };
  }, []); // Run once on mount

  // Update user info whenever wallet data changes
  useEffect(() => {
    if (window.Tawk_API && window.Tawk_API.setAttributes) {
      updateTawkUserInfo();
    }
  }, [userProfile, address, network, isLoggedIn]);

  const updateTawkUserInfo = () => {
    if (!window.Tawk_API) return;

    try {
      // Set user name if available
      if (userProfile?.name && window.Tawk_API.setAttributes) {
        window.Tawk_API.setAttributes({
          name: userProfile.name,
          email: userProfile.email || `${address}@rhizacore.app`,
          hash: address || 'anonymous', // Unique identifier
        }, (error: any) => {
          if (error) {
            console.error('Tawk.to: Error setting user attributes:', error);
          }
        });
      }

      // Add custom attributes for support context
      if (window.Tawk_API.addTags) {
        const tags = [];
        if (isLoggedIn) tags.push('logged-in');
        if (network) tags.push(`network-${network}`);
        if (userProfile?.is_activated) tags.push('activated');
        
        window.Tawk_API.addTags(tags, (error: any) => {
          if (error) {
            console.error('Tawk.to: Error adding tags:', error);
          }
        });
      }

      // Set custom attributes for additional context
      if (window.Tawk_API.addEvent) {
        window.Tawk_API.addEvent('user-info', {
          walletAddress: address || 'Not connected',
          network: network || 'Unknown',
          isActivated: userProfile?.is_activated || false,
          referralCode: userProfile?.referrer_code || 'None',
        }, (error: any) => {
          if (error) {
            console.error('Tawk.to: Error adding event:', error);
          }
        });
      }
    } catch (error) {
      console.error('Tawk.to: Error updating user info:', error);
    }
  };

  // This component doesn't render anything visible
  // The Tawk.to widget is injected into the page by the script
  return null;
};

export default TawkToWidget;
