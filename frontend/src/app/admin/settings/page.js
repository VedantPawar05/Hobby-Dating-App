'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, LogOut, Check, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.js';
import userService from '../../../services/user.service.js';
import authService from '../../../services/auth.service.js';
import ProfileForm from '../../../components/profile/ProfileForm.js';
import Card, { CardHeader, CardBody } from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import Input from '../../../components/common/Input.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import { formatDate } from '../../../utils/formatters.js';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { updateUser, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userService.getProfile();
      setProfile(res?.data?.profile || null);
    } catch (err) {
      setError(err.message || 'Unable to load admin profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
    updateUser(updatedProfile);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const firstValidationError = err?.errors?.[0]?.message;
      setPasswordError(
        firstValidationError || err.message || 'Failed to update password.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading) {
    return <LoadingState message="Loading admin settings..." />;
  }

  if (error || !profile) {
    return (
      <ErrorState
        title="Unable to load settings"
        message={error || 'Admin profile unavailable.'}
        onRetry={fetchProfile}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-surface-900">
          Admin Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your admin account profile, security password, and active session.
        </p>
      </div>

      {/* Authenticated Admin Overview */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-bold text-xl flex items-center justify-center shrink-0">
              {profile.fullName?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-surface-900">{profile.fullName}</h2>
                <StatusBadge value={profile.role} />
                <StatusBadge value={profile.isActive !== false ? 'active' : 'suspended'} />
              </div>
              <p className="text-sm text-slate-600">{profile.email}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.city} • Member since {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-red-600 border-red-200 hover:bg-red-50 self-start sm:self-center"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign Out
          </Button>
        </CardBody>
      </Card>

      {/* Permitted Profile Updates (Reuses existing ProfileForm & PATCH /api/users/profile) */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-surface-900">Profile Information</h2>
          </div>
          <span className="text-xs text-slate-500">Email &amp; role are protected</span>
        </CardHeader>
        <CardBody>
          <ProfileForm initialProfile={profile} onProfileUpdated={handleProfileUpdated} />
        </CardBody>
      </Card>

      {/* Password Update (Uses existing auth system & bcrypt hashing) */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-bold text-surface-900">Change Password</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
            {passwordSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center">
                <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
                {passwordError}
              </div>
            )}

            <Input
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => {
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }));
                setPasswordSuccess('');
                setPasswordError('');
              }}
              required
            />

            <Input
              label="New Password"
              name="newPassword"
              type="password"
              helperText="At least 8 characters with uppercase, lowercase, and a number."
              value={passwordForm.newPassword}
              onChange={(e) => {
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                setPasswordSuccess('');
                setPasswordError('');
              }}
              required
            />

            <Input
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => {
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                setPasswordSuccess('');
                setPasswordError('');
              }}
              required
            />

            <div className="pt-1 flex items-center gap-3">
              <Button type="submit" variant="primary" size="md" loading={changingPassword}>
                <Lock className="w-4 h-4 mr-1.5" />
                Update Password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

