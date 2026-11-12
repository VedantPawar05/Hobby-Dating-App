'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { EVENT_CATEGORIES } from '../../constants/categories.js';
import eventService from '../../services/event.service.js';
import Button from '../common/Button.js';
import Input from '../common/Input.js';

const CATEGORY_OPTIONS = EVENT_CATEGORIES.filter((c) => c !== 'All');

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export function EventFormModal({ isOpen, initialEvent = null, onSaved, onClose }) {
  const isEditing = Boolean(initialEvent?._id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    activityType: '',
    coverImage: '',
    city: '',
    address: '',
    startDateTime: '',
    endDateTime: '',
    capacity: 20,
    price: 0,
    status: 'draft',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialEvent) {
      setFormData({
        title: initialEvent.title || '',
        description: initialEvent.description || '',
        category: initialEvent.category || CATEGORY_OPTIONS[0],
        activityType: initialEvent.activityType || '',
        coverImage: initialEvent.coverImage || '',
        city: initialEvent.location?.city || '',
        address: initialEvent.location?.address || '',
        startDateTime: toDateTimeLocal(initialEvent.startDateTime),
        endDateTime: toDateTimeLocal(initialEvent.endDateTime),
        capacity: initialEvent.capacity ?? 20,
        price: initialEvent.price ?? 0,
        status: initialEvent.status || 'draft',
      });
    } else {
      const tomorrowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrowStart.setMinutes(0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 2 * 60 * 60 * 1000);
      setFormData({
        title: '',
        description: '',
        category: CATEGORY_OPTIONS[0],
        activityType: '',
        coverImage: '',
        city: '',
        address: '',
        startDateTime: toDateTimeLocal(tomorrowStart),
        endDateTime: toDateTimeLocal(tomorrowEnd),
        capacity: 20,
        price: 0,
        status: 'pending',
      });
    }
    setError('');
  }, [isOpen, initialEvent]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const start = new Date(formData.startDateTime);
    const end = new Date(formData.endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please enter valid start and end dates.');
      return;
    }
    if (end <= start) {
      setError('End date and time must be after start date and time.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      activityType: formData.activityType.trim(),
      coverImage: formData.coverImage.trim() || null,
      location: {
        city: formData.city.trim(),
        address: formData.address.trim(),
      },
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      capacity: Number(formData.capacity),
      price: Number(formData.price || 0),
      status: formData.status,
    };

    setSubmitting(true);
    try {
      const res = isEditing
        ? await eventService.updateEvent(initialEvent._id, payload)
        : await eventService.createEvent(payload);
      if (onSaved) {
        onSaved(res?.data?.event, isEditing);
      }
      onClose();
    } catch (err) {
      const firstValidation = err?.errors?.[0]?.message;
      setError(firstValidation || err.message || 'Unable to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-surface-200 rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-surface-900">
            {isEditing ? 'Edit Activity' : 'Create New Activity'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-surface-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Activity Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Saturday 5K Sunrise Run & Espresso"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Activity Type"
              name="activityType"
              value={formData.activityType}
              onChange={handleChange}
              placeholder="e.g. Trail Run, Mixed Doubles"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              required
              minLength={10}
              maxLength={2000}
              placeholder="Describe pace, equipment needed, meeting point, and vibe..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Mumbai"
              required
            />
            <Input
              label="Venue / Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Marine Drive Promenade"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date & Time"
              name="startDateTime"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={handleChange}
              required
            />
            <Input
              label="End Date & Time"
              name="endDateTime"
              type="datetime-local"
              value={formData.endDateTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Capacity"
              name="capacity"
              type="number"
              min={initialEvent?.bookedCount || 1}
              value={formData.capacity}
              onChange={handleChange}
              required
            />
            <Input
              label="Entry Price ($)"
              name="price"
              type="number"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={handleChange}
            />
            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
                Publish Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <Input
            label="Cover Image URL (Optional)"
            name="coverImage"
            type="url"
            value={formData.coverImage}
            onChange={handleChange}
            placeholder="https://example.com/event-cover.jpg"
          />

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-surface-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              {isEditing ? 'Save Changes' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventFormModal;
