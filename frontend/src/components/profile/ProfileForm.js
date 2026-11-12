'use client';

import React, { useState } from 'react';
import { userService } from '../../services/user.service.js';
import { GENDER_OPTIONS } from '../../constants/categories.js';
import Button from '../common/Button.js';
import Input from '../common/Input.js';
import { Check, AlertCircle } from 'lucide-react';

export function ProfileForm({ initialProfile, onProfileUpdated }) {
  const formattedDob = initialProfile.dateOfBirth
    ? new Date(initialProfile.dateOfBirth).toISOString().split('T')[0]
    : '';

  const [formData, setFormData] = useState({
    fullName: initialProfile.fullName || '',
    city: initialProfile.city || '',
    gender: initialProfile.gender || '',
    dateOfBirth: formattedDob,
    bio: initialProfile.bio || '',
    profilePicture: initialProfile.profilePicture || '',
    interests: initialProfile.interests?.join(', ') || '',
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Parse comma-separated interests
      const formattedInterests = formData.interests
        ? formData.interests
            .split(',')
            .map((i) => i.trim())
            .filter((i) => i.length > 0)
        : [];

      const payload = {
        fullName: formData.fullName.trim(),
        city: formData.city.trim(),
        gender: formData.gender || null,
        bio: formData.bio.trim(),
        profilePicture: formData.profilePicture.trim() || null,
        interests: formattedInterests,
      };
      if (formData.dateOfBirth) {
        payload.dateOfBirth = formData.dateOfBirth;
      }

      const response = await userService.updateProfile(payload);
      if (response?.data?.profile) {
        setSuccessMessage('Profile updated successfully!');
        if (onProfileUpdated) {
          onProfileUpdated(response.data.profile);
        }
      }
    } catch (err) {
      const firstValidation = err?.errors?.[0]?.message;
      setErrorMessage(
        firstValidation || err.message || 'Failed to update profile. Please try again.'
      );
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <Input
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        {/* Email (Read only) */}
        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-500">
            Email Address (Verified)
          </label>
          <input
            type="email"
            value={initialProfile.email || ''}
            disabled
            className="w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-lg text-surface-500 cursor-not-allowed"
          />
        </div>

        {/* City */}
        <Input
          label="Home City"
          name="city"
          placeholder="e.g. Seattle, WA"
          value={formData.city}
          onChange={handleChange}
          required
        />

        {/* Gender */}
        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
            Gender
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
          >
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date of Birth & Profile Picture URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleChange}
          helperText="Members must be at least 18 years old"
        />

        <Input
          label="Profile Picture URL"
          name="profilePicture"
          type="url"
          placeholder="https://example.com/avatar.jpg"
          value={formData.profilePicture}
          onChange={handleChange}
          helperText="Direct HTTP/HTTPS image link"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
          About You & Fitness Goals (Bio)
        </label>
        <textarea
          name="bio"
          rows={3}
          maxLength={500}
          value={formData.bio}
          onChange={handleChange}
          placeholder="Tell others what sports, running pace, or activities you enjoy..."
          className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
        />
        <p className="mt-1 text-right text-xs text-surface-400">
          {formData.bio.length} / 500 characters
        </p>
      </div>

      {/* Interests */}
      <Input
        label="Activities & Interests"
        name="interests"
        placeholder="Running, Trail Running, Padel, Hiking, Bouldering"
        value={formData.interests}
        onChange={handleChange}
        helperText="Separate multiple hobbies with commas"
      />

      <div className="pt-2 flex justify-end">
        <Button type="submit" variant="primary" loading={saving}>
          Save Profile Changes
        </Button>
      </div>
    </form>
  );
}

export default ProfileForm;
