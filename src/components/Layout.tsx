import React from 'react';
import { Outlet } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header>
        <h1>PTW Dashboard</h1>
      </header>
      <main>
        {children || <Outlet />}
      </main>
      <footer>
        <p>&copy; 2024 PTW Management System</p>
      </footer>
    </div>
  );
};

export default Layout;