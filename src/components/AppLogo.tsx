import Image from "next/image";

export function AppLogo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icon.png"
      alt="TiendaApps"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ margin: `-${Math.round(size * 0.12)}px`, marginRight: `-${Math.round(size * 0.18)}px` }}
      priority
    />
  );
}
