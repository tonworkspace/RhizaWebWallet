import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="luxury-card p-6 rounded-[2rem] animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-white/5 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/5 rounded-lg w-3/4" />
        <div className="h-3 bg-white/5 rounded-lg w-1/2" />
      </div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
    <div className="luxury-card p-10 rounded-[3rem]">
      <div className="space-y-6">
        <div className="h-6 bg-white/5 rounded-lg w-1/3 mx-auto" />
        <div className="h-16 bg-white/5 rounded-lg w-2/3 mx-auto" />
        <div className="h-32 bg-white/5 rounded-lg w-full" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-white/5 rounded-2xl" />
      ))}
    </div>
    <ListSkeleton count={4} />
  </div>
);

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  width = '100%', 
  height = 20,
  className = ''
}) => (
  <div 
    className={`bg-white/5 rounded-lg animate-pulse ${className}`}
    style={{ 
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height
    }}
  />
);

export default LoadingSkeleton;
