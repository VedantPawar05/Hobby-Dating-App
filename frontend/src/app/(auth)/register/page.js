'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext.js';
import Button from '../../../components/common/Button.js';
import Input from '../../../components/common/Input.js';
import { GENDER_OPTIONS } from '../../../constants/categories.js';
import { AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    city: '',
    gender: '',
    profilePicture: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/events');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    // Password must be >= 8 chars and contain uppercase, lowercase, and number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!passwordRegex.test(formData.password)) {
      errors.password =
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
    }

    // Age validation (18+)
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      if (isNaN(birthDate.getTime())) {
        errors.dateOfBirth = 'Invalid date format.';
      } else if (birthDate > cutoff) {
        errors.dateOfBirth = 'You must be at least 18 years old to join Ricoz.';
      }
    }

    if (!formData.city.trim() || formData.city.trim().length < 2) {
      errors.city = 'City is required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        dateOfBirth: formData.dateOfBirth,
        city: formData.city.trim(),
        gender: formData.gender || null,
        profilePicture: formData.profilePicture.trim() || null,
      };

      await register(payload);
      router.replace('/events');
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const fieldErrors = {};
        err.errors.forEach((e) => {
          fieldErrors[e.field] = e.message;
        });
        setValidationErrors(fieldErrors);
        setErrorMessage('Please correct the highlighted fields.');
      } else {
        setErrorMessage(
          err.message || 'Registration failed. Please check your inputs and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white border border-surface-200 rounded-2xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            <UserPlus className="w-5 h-5 text-brand-700" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">
            Join Ricoz Club
          </h1>
          <p className="text-sm text-surface-600">
            Create your account to discover run clubs, padel, hiking, and hobbies.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 text-red-600 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <Input
              label="Full Name"
              name="fullName"
              placeholder="e.g. Alex Morgan"
              value={formData.fullName}
              onChange={handleChange}
              error={validationErrors.fullName}
              required
            />

            {/* City */}
            <Input
              label="Home City"
              name="city"
              placeholder="e.g. Seattle, WA"
              value={formData.city}
              onChange={handleChange}
              error={validationErrors.city}
              required
            />
          </div>

          {/* Email */}
          <Input
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            error={validationErrors.email}
            required
          />

          {/* Password */}
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters, 1 uppercase, 1 number"
            value={formData.password}
            onChange={handleChange}
            error={validationErrors.password}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date of Birth */}
            <Input
              label="Date of Birth (18+)"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              error={validationErrors.dateOfBirth}
              required
            />

            {/* Gender */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
                Gender (Optional)
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Profile Picture */}
          <Input
            label="Profile Picture URL (Optional)"
            name="profilePicture"
            type="url"
            placeholder="https://example.com/avatar.jpg"
            value={formData.profilePicture}
            onChange={handleChange}
            helperText="Direct image URL for your profile avatar"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-2.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Registration
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-surface-100 text-center text-xs text-surface-600">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-semibold text-brand-700 hover:text-brand-800 transition-colors"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
