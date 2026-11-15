'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import ProfileForm from '../../../components/profile/ProfileForm.js';
import PrivacySettingsForm from '../../../components/profile/PrivacySettingsForm.js';
import BlockedUsersList from '../../../components/profile/BlockedUsersList.js';
import AccountSafetyModal from '../../../components/profile/AccountSafetyModal.js';
import ProfileCompletionCard from '../../../components/profile/ProfileCompletionCard.js';
import { userService } from '../../../services/user.service.js';
import { useAuth } from '../../../context/AuthContext.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import Card from '../../../components/common/Card.js';
import { User, MapPin, Sparkles, Calendar, Shield, UserX, AlertOctagon, Settings } from 'lucide-react';
import { formatDate } from '../../../utils/formatters.js';

function ProfileContent() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, completionRes] = await Promise.all([
        userService.getProfile(),
        userService.getProfileCompletion().catch(() => null),
      ]);

      if (profileRes?.data?.profile) {
        setProfile(profileRes.data.profile);
      }
      if (completionRes?.data) {
        setCompletion(completionRes.data);
      }
    } catch (err) {
      setError(err.message || 'Could not load profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleProfileUpdated = (updated) => {
    setProfile(updated);
    updateUser(updated);
    // Refresh completion status
    userService.getProfileCompletion()
      .then((res) => {
        if (res?.data) setCompletion(res.data);
      })
      .catch(() => null);
  };

  if (loading) {
    return <LoadingState message="Loading your profile..." />;
  }

  if (error || !profile) {
    return (
      <ErrorState
        title="Could not load profile"
        message={error || 'Failed to retrieve profile data.'}
        onRetry={fetchProfileData}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <Card className="p-6 sm:p-8 bg-gradient-to-r from-brand-50/50 to-white">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt={profile.fullName}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-brand-200 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-brand-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-sm shrink-0">
              {profile.fullName?.charAt(0) || 'U'}
            </div>
          )}

          <div className="space-y-2 text-center sm:text-left flex-grow">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-extrabold text-surface-900">
                {profile.fullName}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 w-max mx-auto sm:mx-0 uppercase tracking-wider">
                {profile.role || 'Member'}
              </span>
            </div>

            <p className="text-sm text-surface-600 max-w-xl">
              {profile.bio || 'No bio added yet. Tell club members about your sports and hobbies below!'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-surface-500 font-medium">
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-surface-400" />
                {profile.city || 'City not set'}
              </span>
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-surface-400" />
                Joined {formatDate(profile.createdAt)}
              </span>
            </div>

            {/* Interest badges */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                {profile.interests.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white border border-surface-200 text-surface-700 shadow-2xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Profile Completion Indicator */}
      {completion && (
        <ProfileCompletionCard
          completion={completion}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-surface-200 overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'details'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <User className="w-4 h-4" />
          Profile Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'privacy'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Privacy & Visibility
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('blocked')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'blocked'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <UserX className="w-4 h-4" />
          Blocked Users
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('safety')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'safety'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          Account Safety
        </button>
      </div>

      {/* Tab Content Cards */}
      <Card className="p-6 sm:p-8">
        {activeTab === 'details' && (
          <div>
            <div className="mb-6 pb-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">Edit Profile Information</h2>
              <p className="text-xs text-surface-500">
                Keep your location, hobbies, and sports bio updated for club events and mixers.
              </p>
            </div>
            <ProfileForm initialProfile={profile} onProfileUpdated={handleProfileUpdated} />
          </div>
        )}

        {activeTab === 'privacy' && (
          <div>
            <div className="mb-6 pb-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">Profile Privacy & Safety</h2>
              <p className="text-xs text-surface-500">
                Configure who can see your profile card and manage granular visibility options.
              </p>
            </div>
            <PrivacySettingsForm
              initialPrivacy={profile.privacy}
              onPrivacyUpdated={handleProfileUpdated}
            />
          </div>
        )}

        {activeTab === 'blocked' && (
          <div>
            <BlockedUsersList />
          </div>
        )}

        {activeTab === 'safety' && (
          <div>
            <div className="mb-6 pb-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">Account Safety & Deactivation</h2>
              <p className="text-xs text-surface-500">
                Manage your account lifecycle, pause your membership, or permanently delete your account.
              </p>
            </div>
            <AccountSafetyModal />
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
