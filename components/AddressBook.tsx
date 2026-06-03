/**
 * Address Book Component
 * 
 * Manages trusted addresses for secure transactions
 * Part of Security Issue #20 fix
 */

import React, { useState, useEffect } from 'react';
import { Book, Plus, Trash2, Edit2, Check, X, Shield, Clock } from 'lucide-react';
import {
  getAddressBook,
  addToAddressBook,
  removeFromAddressBook,
  AddressBookEntry,
} from '../utils/phishingProtection';
import { useToast } from '../context/ToastContext';

interface AddressBookProps {
  onSelectAddress?: (address: string) => void;
  showSelection?: boolean;
}

const AddressBook: React.FC<AddressBookProps> = ({
  onSelectAddress,
  showSelection = false,
}) => {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: '',
    name: '',
    note: '',
    isTrusted: false,
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadAddressBook();
  }, []);

  const loadAddressBook = () => {
    const book = getAddressBook();
    // Sort by last used (most recent first), then by added date
    book.sort((a, b) => {
      if (a.lastUsed && b.lastUsed) return b.lastUsed - a.lastUsed;
      if (a.lastUsed) return -1;
      if (b.lastUsed) return 1;
      return b.addedAt - a.addedAt;
    });
    setEntries(book);
  };

  const handleAdd = () => {
    if (!formData.address.trim() || !formData.name.trim()) {
      showToast('Address and name are required', 'error');
      return;
    }

    const result = addToAddressBook(
      formData.address,
      formData.name,
      formData.note,
      formData.isTrusted
    );

    if (result.success) {
      showToast('Address added to address book', 'success');
      setFormData({ address: '', name: '', note: '', isTrusted: false });
      setIsAdding(false);
      loadAddressBook();
    } else {
      showToast(result.error || 'Failed to add address', 'error');
    }
  };

  const handleRemove = (address: string) => {
    if (window.confirm('Remove this address from your address book?')) {
      if (removeFromAddressBook(address)) {
        showToast('Address removed', 'success');
        loadAddressBook();
      } else {
        showToast('Failed to remove address', 'error');
      }
    }
  };

  const handleSelect = (address: string) => {
    if (onSelectAddress) {
      onSelectAddress(address);
      showToast('Address selected', 'success');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Address Book
          </h3>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400">
            {entries.length}
          </span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-black rounded-lg font-bold text-sm transition-colors"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Address *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="EQ..."
              className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., John's Wallet"
              className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Note (Optional)
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="e.g., Business partner"
              className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="trusted"
              checked={formData.isTrusted}
              onChange={(e) =>
                setFormData({ ...formData, isTrusted: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label
              htmlFor="trusted"
              className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1"
            >
              <Shield size={14} className="text-green-600 dark:text-green-400" />
              Mark as trusted (skip security warnings)
            </label>
          </div>
          <button
            onClick={handleAdd}
            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-black rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Add to Address Book
          </button>
        </div>
      )}

      {/* Address List */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No saved addresses yet</p>
          <p className="text-xs mt-1">Add trusted addresses for quick access</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.address}
              className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {entry.name}
                    </h4>
                    {entry.isTrusted && (
                      <span title="Trusted address">
                        <Shield
                          size={14}
                          className="text-green-600 dark:text-green-400 flex-shrink-0"
                        />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mb-1">
                    {formatAddress(entry.address)}
                  </p>
                  {entry.note && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                      {entry.note}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Added {formatDate(entry.addedAt)}
                    </span>
                    {entry.lastUsed && (
                      <span>• Last used {formatDate(entry.lastUsed)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {showSelection && (
                    <button
                      onClick={() => handleSelect(entry.address)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Use this address"
                    >
                      <Check size={16} className="text-primary" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(entry.address)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressBook;
