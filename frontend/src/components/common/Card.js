import React from 'react';

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-white border border-surface-200 rounded-xl overflow-hidden transition-all duration-200 ${
        hover ? 'hover:shadow-md hover:border-surface-300' : 'shadow-sm'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`p-5 border-b border-surface-100 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-4 bg-surface-50 border-t border-surface-100 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
