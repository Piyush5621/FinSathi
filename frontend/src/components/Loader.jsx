import React from "react";
import ClipLoader from "react-spinners/ClipLoader";

export const Loader = ({ size = 40, className = '' }) => {
  return (
    <div className={`flex items-center justify-center p-6 w-full ${className}`}>
      <ClipLoader color="#3157D5" size={size} />
    </div>
  );
};

export default Loader;
