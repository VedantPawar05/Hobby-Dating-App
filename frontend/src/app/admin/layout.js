import React from 'react';
import AdminRoute from '../../components/auth/AdminRoute.js';
import AdminSidebar from '../../components/admin/AdminSidebar.js';

export default function AdminLayout({ children }) {
  return (
    <AdminRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          <AdminSidebar />
          <section className="flex-1 min-w-0">{children}</section>
        </div>
      </div>
    </AdminRoute>
  );
}

