'use client';

import React, { useState } from 'react';
import { userService } from '../../services/user.service.js';
import Button from '../common/Button.js';
import { Check, AlertCircle, Shield, Globe, Users, HeartHandshake, Eye } from 'lucide-react';

export default function PrivacySettingsForm({ initialPrivacy = {}, onPrivacyUpdated }) {
  const [privacy, setPrivacy] = useState({
    profileVisibility: initialPrivacy?.profileVisibility || 'public',
    showCity: initialPrivacy?.showCity !== false,
    showInterests: initialPrivacy?.showInterests !== false,
    allowDiscovery: initialPrivacy?.allowDiscovery !== false,
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleVisibilityChange = (visibility) => {
    setPrivacy((prev) => ({ ...prev, profileVisibility: visibility }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleToggle = (key) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await userService.updateProfile({
        privacy: {
          profileVisibility: privacy.profileVisibility,
          showCity: privacy.showCity,
          showInterests: privacy.showInterests,
          allowDiscovery: privacy.allowDiscovery,
        },
      });

      if (response?.data?.profile) {
        setSuccessMessage('Privacy settings updated successfully!');
        if (onPrivacyUpdated) {
          onPrivacyUpdated(response.data.profile);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update privacy settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center">
          <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Profile Visibility Options */}
      <div>
        <label className="block mb-2 text-sm font-bold text-surface-900">
          Who can see your profile?
        </label>
        <p className="text-xs text-surface-500 mb-4">
          Control how much of your profile is discoverable across the platform. Note that your email address and password are never exposed to any member or public viewer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Public */}
          <div
            onClick={() => handleVisibilityChange('public')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              privacy.profileVisibility === 'public'
                ? 'border-brand-600 bg-brand-50/40 text-brand-900 shadow-2xs'
                : 'border-surface-200 hover:border-surface-300 bg-white text-surface-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold">Public</span>
            </div>
            <p className="text-xs text-surface-500 leading-relaxed">
              Visible to all visitors and event attendees. Recommended for maximum mixer activity.
            </p>
          </div>

          {/* Members Only */}
          <div
            onClick={() => handleVisibilityChange('members_only')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              privacy.profileVisibility === 'members_only'
                ? 'border-brand-600 bg-brand-50/40 text-brand-900 shadow-2xs'
                : 'border-surface-200 hover:border-surface-300 bg-white text-surface-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold">Members Only</span>
            </div>
            <p className="text-xs text-surface-500 leading-relaxed">
              Visible only to signed-in, authenticated members on Hobby Dating.
            </p>
          </div>

          {/* Matches Only */}
          <div
            onClick={() => handleVisibilityChange('matches_only')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              privacy.profileVisibility === 'matches_only'
                ? 'border-brand-600 bg-brand-50/40 text-brand-900 shadow-2xs'
                : 'border-surface-200 hover:border-surface-300 bg-white text-surface-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <HeartHandshake className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold">Matches Only</span>
            </div>
            <p className="text-xs text-surface-500 leading-relaxed">
              Your profile is hidden until you and another attendee form a verified mutual match.
            </p>
          </div>
        </div>
      </div>

      {/* Field Granular Privacy Toggles */}
      <div className="space-y-4 pt-4 border-t border-surface-200">
        <h4 className="text-sm font-bold text-surface-900">Information Privacy & Discovery</h4>

        {/* Show City */}
        <div className="flex items-center justify-between p-3.5 bg-surface-50/70 rounded-xl border border-surface-200/80">
          <div>
            <p className="text-sm font-semibold text-surface-800">Display Home City</p>
            <p className="text-xs text-surface-500">Allow other attendees to see your location on your public card.</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('showCity')}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              privacy.showCity ? 'bg-brand-600' : 'bg-surface-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                privacy.showCity ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show Interests */}
        <div className="flex items-center justify-between p-3.5 bg-surface-50/70 rounded-xl border border-surface-200/80">
          <div>
            <p className="text-sm font-semibold text-surface-800">Display Hobbies & Interests</p>
            <p className="text-xs text-surface-500">Showcase your tagged sports and activities to prospective matches.</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('showInterests')}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              privacy.showInterests ? 'bg-brand-600' : 'bg-surface-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                privacy.showInterests ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Allow Discovery */}
        <div className="flex items-center justify-between p-3.5 bg-surface-50/70 rounded-xl border border-surface-200/80">
          <div>
            <p className="text-sm font-semibold text-surface-800">Allow Community Discovery</p>
            <p className="text-xs text-surface-500">Include your card in member discovery and mixer recommendations.</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('allowDiscovery')}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              privacy.allowDiscovery ? 'bg-brand-600' : 'bg-surface-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                privacy.allowDiscovery ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button type="submit" variant="primary" loading={saving}>
          Save Privacy Preferences
        </Button>
      </div>
    </form>
  );
}
