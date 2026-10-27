import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-[#111722] rounded-xl border border-gray-200/80 dark:border-[#1E293B] shadow-sm transition-colors duration-200 overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('px-5 py-4 border-b border-gray-100 dark:border-[#1E293B]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3 className={cn('text-base font-bold text-gray-900 dark:text-white tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('px-5 py-3.5 bg-gray-50/50 dark:bg-[#0B0E14]/40 border-t border-gray-100 dark:border-[#1E293B]', className)} {...props}>
      {children}
    </div>
  );
}
