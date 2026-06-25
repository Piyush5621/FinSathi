import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, rounded = 'rounded-md', className = '' }) => {
  return (
    <div
      className={`skeleton-loader ${rounded} ${className}`}
      style={{
        width: width || '100%',
        height: height || '100%',
      }}
    />
  );
};

export default Skeleton;
