'use client';

import React, { useState } from 'react';
import { userService } from '../../services/user.service.js';
import { useAuth } from '../../context/AuthContext.js';
import Button from '../common/Button.js';
import Input from '../common/Input.js';
import Modal from '../common/Modal.js';
import { AlertTriangle, PowerOff, UserMinus, ShieldAlert } from 'lucide-react';

export default function AccountSafetyModal() {
  const { logout } = useAuth();

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Deactivate form state
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  // Delete form state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeactivate = async (e) => {
    e.preventDefault();
    setDeactivating(true);
    setDeactivateError('');

    try {
      await userService.deactivateAccount(deactivatePassword, deactivateReason);
      await logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?deactivated=true';
      }
    } catch (err) {
      setDeactivateError(err.message || 'Incorrect password or deactivation failed.');
      setDeactivating(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('You must type "DELETE" exactly to confirm permanent account deletion.');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      await userService.deleteAccount(deletePassword, deleteConfirmation, deleteReason);
      await logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?deleted=true';
      }
    } catch (err) {
      setDeleteError(err.message || 'Account deletion failed. Verify your password.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm">Account Security & Danger Zone</p>
          <p>
            Temporarily pause your activity or permanently remove your personal profile from Hobby Dating. All active login sessions will be immediately invalidated.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deactivation Card */}
        <div className="p-5 rounded-xl border border-surface-200 bg-white space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
              <PowerOff className="w-4 h-4 text-amber-600" />
              Deactivate Account
            </div>
            <p className="text-xs text-surface-500 leading-relaxed">
              Temporarily deactivate your account. Your profile will be hidden from public discovery, event mixers, and searches until you reactivate it.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50"
            onClick={() => {
              setDeactivatePassword('');
              setDeactivateReason('');
              setDeactivateError('');
              setDeactivateOpen(true);
            }}
          >
            Deactivate My Account
          </Button>
        </div>

        {/* Deletion Card */}
        <div className="p-5 rounded-xl border border-red-200 bg-red-50/20 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
              <UserMinus className="w-4 h-4 text-red-600" />
              Permanent Account Deletion
            </div>
            <p className="text-xs text-surface-500 leading-relaxed">
              Permanently erase your identity, bio, picture, and personal data. This action is irreversible and your account cannot be recovered.
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            className="w-full text-xs font-semibold"
            onClick={() => {
              setDeletePassword('');
              setDeleteConfirmation('');
              setDeleteReason('');
              setDeleteError('');
              setDeleteOpen(true);
            }}
          >
            Delete Account Permanently
          </Button>
        </div>
      </div>

      {/* Deactivate Modal */}
      <Modal
        isOpen={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        title="Confirm Account Deactivation"
      >
        <form onSubmit={handleDeactivate} className="space-y-4">
          <p className="text-xs text-surface-600">
            Please enter your password to deactivate your account. You will be logged out immediately.
          </p>

          {deactivateError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
              {deactivateError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            required
            value={deactivatePassword}
            onChange={(e) => setDeactivatePassword(e.target.value)}
            placeholder="Enter your account password"
          />

          <Input
            label="Reason (Optional)"
            type="text"
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            placeholder="e.g. Taking a short break"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={deactivating}
            >
              Deactivate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Permanently Delete Account"
      >
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">Warning:</span> This is a permanent and irreversible action. All your profile information, photos, and match preferences will be purged.
            </div>
          </div>

          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
              {deleteError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Enter your account password"
          />

          <div>
            <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
              Type &quot;DELETE&quot; to confirm
            </label>
            <input
              type="text"
              required
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-mono uppercase"
            />
          </div>

          <Input
            label="Reason for leaving (Optional)"
            type="text"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Feedback to help us improve"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={deleteConfirmation !== 'DELETE'}
              loading={deleting}
            >
              Delete Permanently
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
