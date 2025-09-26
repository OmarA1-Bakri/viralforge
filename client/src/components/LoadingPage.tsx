import logoVideoSrc from "@assets/vfloadlogo_1758848782035.mp4";

interface LoadingPageProps {
  message?: string;
}

export default function LoadingPage({ message = "Loading ViralForgeAI..." }: LoadingPageProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      {/* Animated Logo Video */}
      <div className="relative mb-8">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-48 h-48 md:w-64 md:h-64 object-contain"
          data-testid="loading-video"
        >
          <source src={logoVideoSrc} type="video/mp4" />
        </video>
      </div>

      {/* Loading Message */}
      <div className="text-center px-6">
        <p className="text-white text-lg font-medium mb-4" data-testid="loading-message">
          {message}
        </p>
        
        {/* Loading Dots Animation */}
        <div className="flex justify-center space-x-1" data-testid="loading-dots">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
        </div>
      </div>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20"></div>
      </div>
    </div>
  );
}