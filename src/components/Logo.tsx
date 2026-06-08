import logoImg from "@/assets/wandr-logo.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className = "" }: LogoProps) {
  return (
    <img
      src={logoImg}
      alt="Wandr"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
    />
  );
}

interface LogoWordmarkProps {
  text?: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}

export function LogoWordmark({
  text = "Wandr",
  size = 28,
  className = "",
  iconClassName = "",
}: LogoWordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} className={iconClassName} />
      {text && (
        <span className="font-serif-italic text-foreground">{text}</span>
      )}
    </span>
  );
}

interface LogoAvatarProps {
  size?: number;
  className?: string;
}

export function LogoAvatar({ size = 24, className = "" }: LogoAvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <LogoMark size={size * 0.65} />
    </div>
  );
}
