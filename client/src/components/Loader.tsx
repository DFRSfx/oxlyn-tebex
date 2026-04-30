import React from 'react';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50">
      <div className="relative flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-500"></div>
        <img
          src="https://i.imgur.com/ndYSTED.png"
          alt="Loading"
          className="absolute h-16 w-16"
        />
      </div>
      {message && (
        <div className="mt-4 text-white text-lg">
          {message}
        </div>
      )}
    </div>
  );
};

export default Loader;
