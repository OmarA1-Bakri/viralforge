import logoVideoSrc from "@assets/vfloadlogo_1758848782035.mp4";

export default function LoadingPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" data-testid="splash-overlay">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-contain"
        data-testid="splash-video"
      >
        <source src={logoVideoSrc} type="video/mp4" />
      </video>
    </div>
  );
}