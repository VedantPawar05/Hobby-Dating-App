'use client';

import React, { useState, useEffect } from 'react';
import { userService } from '../../services/user.service.js';
import Button from '../common/Button.js';
import LoadingState from '../common/LoadingState.js';
import { UserX, ShieldCheck, Check, AlertCircle, Trash2 } from 'lucide-react';

export default function BlockedUsersList() {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchBlockedUsers = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await userService.getBlockedUsers();
      if (res?.data?.blockedUsers) {
        setBlockedUsers(res.data.blockedUsers);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load blocked users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const handleUnblock = async (targetUserId, targetName) => {
    setUnblockingId(targetUserId);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await userService.unblockUser(targetUserId);
      setBlockedUsers((prev) => prev.filter((u) => u._id !== targetUserId));
      setSuccessMessage(`Unblocked ${targetName || 'user'} successfully.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to unblock user. Please try again.');
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading blocked members list..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-surface-200">
        <div>
          <h3 className="text-base font-bold text-surface-900">Blocked Accounts</h3>
          <p className="text-xs text-surface-500">
            Blocked users cannot view your full profile, tag you in mixers, or send you private messages.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-surface-100 rounded-full text-surface-700">
          {blockedUsers.length} Blocked
        </span>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center">
          <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {blockedUsers.length === 0 ? (
        <div className="py-12 text-center bg-surface-50/50 rounded-2xl border border-dashed border-surface-200">
          <ShieldCheck className="w-10 h-10 mx-auto text-emerald-600 mb-2 opacity-80" />
          <h4 className="text-sm font-bold text-surface-800">No Blocked Users</h4>
          <p className="text-xs text-surface-500 max-w-sm mx-auto mt-1">
            You currently have not blocked any attendees or members. Your communication channels are open.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-surface-100 rounded-xl border border-surface-200 overflow-hidden bg-white">
          {blockedUsers.map((user) => (
            <div
              key={user._id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-surface-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-200 text-surface-700 font-bold flex items-center justify-center text-sm">
                    {user.fullName?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-surface-900">{user.fullName}</h4>
                  <p className="text-xs text-surface-500">{user.city || 'Location hidden'}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                loading={unblockingId === user._id}
                onClick={() => handleUnblock(user._id, user.fullName)}
                className="text-xs hover:border-red-300 hover:text-red-700"
              >
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
