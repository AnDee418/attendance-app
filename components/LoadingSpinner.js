import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center">
      {/* メインのアニメーション */}
      <div className="relative">
        {/* 外側の円 */}
        <div className="absolute inset-0 animate-ping-slow rounded-full h-32 w-32 border-4 border-blue-200" />
        {/* 中間の円 */}
        <div className="absolute inset-0 animate-spin-slow rounded-full h-32 w-32 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent" />
        {/* 内側の円 */}
        <div className="relative rounded-full h-32 w-32 border-4 border-blue-100 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 animate-pulse" />
        </div>
      </div>
      
      {/* ローディングテキスト */}
      <div className="mt-8 text-blue-900/80 font-medium">
        <div className="flex items-center gap-1">
          <span className="animate-bounce delay-0">L</span>
          <span className="animate-bounce delay-75">o</span>
          <span className="animate-bounce delay-150">a</span>
          <span className="animate-bounce delay-225">d</span>
          <span className="animate-bounce delay-300">i</span>
          <span className="animate-bounce delay-375">n</span>
          <span className="animate-bounce delay-450">g</span>
          <span className="animate-bounce delay-525">.</span>
          <span className="animate-bounce delay-600">.</span>
          <span className="animate-bounce delay-675">.</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 