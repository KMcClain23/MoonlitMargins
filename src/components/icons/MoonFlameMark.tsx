import Image from "next/image";

export default function MoonFlameMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/brand/moon-flame-emblem.png"
      alt=""
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      priority
    />
  );
}
