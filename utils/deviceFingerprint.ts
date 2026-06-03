/**
 * Device Fingerprinting for Encryption
 * 
 * Security Issue #2 FIX - COMPLETE IMPLEMENTATION
 * 
 * Uses Web Crypto API to generate a persistent, cryptographically secure
 * device key that is unique per browser/device and cannot be easily reproduced.
 * 
 * Key Features:
 * - Cryptographically secure random generation (Web Crypto API)
 * - Persistent storage in localStorage
 * - Fallback to IndexedDB for better persistence
 * - Migration support from old implementations
 * - Cannot be reproduced by attackers
 * - Survives browser updates
 */

const DEVICE_KEY_STORAGE = 'rhiza_device_key_v2';
const DEVICE_KEY_INDEXEDDB = 'rhiza_device_keys';
const DEVICE_KEY_VERSION = 2;

interface DeviceKeyData {
  key: string;
  version: number;
  createdAt: number;
  lastUsed: number;
}

/**
 * Generate a cryptographically secure device key using Web Crypto API
 * This is the GOLD STANDARD for device fingerprinting
 */
async function generateSecureDeviceKey(): Promise<string> {
  try {
    // Use Web Crypto API to generate a 256-bit random key
    const keyMaterial = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // Export the key to raw format
    const rawKey = await crypto.subtle.exportKey('raw', keyMaterial);
    
    // Convert to hex string
    const keyArray = new Uint8Array(rawKey);
    const keyHex = Array.from(keyArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return keyHex;
  } catch (error) {
    console.error('❌ Web Crypto API failed, falling back to crypto.getRandomValues:', error);
    
    // Fallback to crypto.getRandomValues (still secure, but less ideal)
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Store device key in IndexedDB for better persistence
 * IndexedDB survives cache clears better than localStorage
 */
async function storeInIndexedDB(keyData: DeviceKeyData): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DEVICE_KEY_INDEXEDDB, 1);

      request.onerror = () => {
        console.warn('⚠️ IndexedDB not available, using localStorage only');
        resolve(false);
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        
        store.put(keyData, 'device_key');
        
        transaction.oncomplete = () => {
          db.close();
          resolve(true);
        };
        
        transaction.onerror = () => {
          db.close();
          resolve(false);
        };
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
    } catch (error) {
      console.warn('⚠️ IndexedDB error:', error);
      resolve(false);
    }
  });
}

/**
 * Retrieve device key from IndexedDB
 */
async function retrieveFromIndexedDB(): Promise<DeviceKeyData | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DEVICE_KEY_INDEXEDDB, 1);

      request.onerror = () => {
        resolve(null);
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('keys')) {
          db.close();
          resolve(null);
          return;
        }

        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const getRequest = store.get('device_key');

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };

        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
    } catch (error) {
      resolve(null);
    }
  });
}

/**
 * Migrate from old device key implementation (v1)
 */
function migrateFromV1(): string | null {
  const oldKey = localStorage.getItem('rhiza_device_key');
  if (oldKey) {
    console.log('🔄 Migrating device key from v1 to v2');
    return oldKey;
  }
  return null;
}

/**
 * Get or generate device key with dual storage (localStorage + IndexedDB)
 * 
 * This is the main function to use for device fingerprinting
 */
export async function getDeviceKey(): Promise<string> {
  // Try localStorage first (fastest)
  const localStorageData = localStorage.getItem(DEVICE_KEY_STORAGE);
  
  if (localStorageData) {
    try {
      const keyData: DeviceKeyData = JSON.parse(localStorageData);
      
      // Update last used timestamp
      keyData.lastUsed = Date.now();
      localStorage.setItem(DEVICE_KEY_STORAGE, JSON.stringify(keyData));
      
      // Sync to IndexedDB in background (don't wait)
      storeInIndexedDB(keyData).catch(() => {});
      
      return keyData.key;
    } catch (error) {
      console.warn('⚠️ Failed to parse localStorage device key, regenerating');
    }
  }

  // Try IndexedDB (more persistent)
  const indexedDBData = await retrieveFromIndexedDB();
  
  if (indexedDBData) {
    console.log('✅ Restored device key from IndexedDB');
    
    // Update last used and sync to localStorage
    indexedDBData.lastUsed = Date.now();
    localStorage.setItem(DEVICE_KEY_STORAGE, JSON.stringify(indexedDBData));
    
    return indexedDBData.key;
  }

  // Try migration from v1
  const migratedKey = migrateFromV1();
  
  if (migratedKey) {
    const keyData: DeviceKeyData = {
      key: migratedKey,
      version: DEVICE_KEY_VERSION,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };
    
    // Store in both locations
    localStorage.setItem(DEVICE_KEY_STORAGE, JSON.stringify(keyData));
    await storeInIndexedDB(keyData);
    
    // Remove old key
    localStorage.removeItem('rhiza_device_key');
    
    console.log('✅ Migrated device key from v1 to v2');
    return migratedKey;
  }

  // Generate new device key
  console.log('🔑 Generating new secure device key...');
  const newKey = await generateSecureDeviceKey();
  
  const keyData: DeviceKeyData = {
    key: newKey,
    version: DEVICE_KEY_VERSION,
    createdAt: Date.now(),
    lastUsed: Date.now()
  };

  // Store in both locations
  localStorage.setItem(DEVICE_KEY_STORAGE, JSON.stringify(keyData));
  await storeInIndexedDB(keyData);

  console.log('✅ Device key generated and stored securely');
  return newKey;
}

/**
 * Clear device key (for logout/reset)
 */
export async function clearDeviceKey(): Promise<void> {
  // Clear localStorage
  localStorage.removeItem(DEVICE_KEY_STORAGE);
  localStorage.removeItem('rhiza_device_key'); // Old version
  
  // Clear IndexedDB
  try {
    const request = indexedDB.open(DEVICE_KEY_INDEXEDDB, 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (db.objectStoreNames.contains('keys')) {
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        store.delete('device_key');
        
        transaction.oncomplete = () => {
          db.close();
          console.log('✅ Device key cleared from all storage');
        };
      } else {
        db.close();
      }
    };
  } catch (error) {
    console.warn('⚠️ Failed to clear IndexedDB:', error);
  }
}

/**
 * Get device key info (for debugging/diagnostics)
 */
export async function getDeviceKeyInfo(): Promise<{
  exists: boolean;
  version: number;
  createdAt: Date | null;
  lastUsed: Date | null;
  storage: ('localStorage' | 'indexedDB' | 'both' | 'none');
}> {
  const localStorageData = localStorage.getItem(DEVICE_KEY_STORAGE);
  const indexedDBData = await retrieveFromIndexedDB();
  
  let storage: 'localStorage' | 'indexedDB' | 'both' | 'none' = 'none';
  
  if (localStorageData && indexedDBData) {
    storage = 'both';
  } else if (localStorageData) {
    storage = 'localStorage';
  } else if (indexedDBData) {
    storage = 'indexedDB';
  }
  
  const keyData = localStorageData 
    ? JSON.parse(localStorageData) 
    : indexedDBData;
  
  return {
    exists: !!keyData,
    version: keyData?.version || 0,
    createdAt: keyData?.createdAt ? new Date(keyData.createdAt) : null,
    lastUsed: keyData?.lastUsed ? new Date(keyData.lastUsed) : null,
    storage
  };
}

/**
 * Test device key generation (for diagnostics)
 */
export async function testDeviceKeyGeneration(): Promise<{
  success: boolean;
  webCryptoAvailable: boolean;
  indexedDBAvailable: boolean;
  keyGenerated: boolean;
  error?: string;
}> {
  try {
    // Test Web Crypto API
    const webCryptoAvailable = !!(crypto && crypto.subtle && crypto.subtle.generateKey);
    
    // Test IndexedDB
    let indexedDBAvailable = false;
    try {
      const testRequest = indexedDB.open('test', 1);
      testRequest.onsuccess = () => {
        indexedDBAvailable = true;
        testRequest.result.close();
      };
    } catch {
      indexedDBAvailable = false;
    }
    
    // Test key generation
    const testKey = await generateSecureDeviceKey();
    const keyGenerated = testKey.length === 64; // 32 bytes = 64 hex chars
    
    return {
      success: true,
      webCryptoAvailable,
      indexedDBAvailable,
      keyGenerated
    };
  } catch (error) {
    return {
      success: false,
      webCryptoAvailable: false,
      indexedDBAvailable: false,
      keyGenerated: false,
      error: String(error)
    };
  }
}
