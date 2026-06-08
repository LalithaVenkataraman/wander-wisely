import logoImg from "@/assets/wandr-logo.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className = "" }: LogoProps) {
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
        <span className="font-serif-italic text-accent">{text}</span>
      )}
    </span>
  );
}

interface LogoAvatarProps {
  size?: number;
  className?: string;
}

export function LogoAvatar({ size = 32, className = "" }: LogoAvatarProps) {
  return <LogoMark size={size} className={className} />;
}
