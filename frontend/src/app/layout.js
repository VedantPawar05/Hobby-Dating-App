import './globals.css';
import { AuthProvider } from '../context/AuthContext.js';
import Navbar from '../components/layout/Navbar.js';
import Footer from '../components/layout/Footer.js';

export const metadata = {
  title: 'Ricoz Club – Activity-First Run Club & Hobby Platform',
  description:
    'Discover real-world run clubs, hiking, padel, and hobby events. Meet genuine people naturally through the activities you enjoy.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
