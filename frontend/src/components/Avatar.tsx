import { initials } from "@/lib/utils";
import { Users } from "lucide-react";

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  isGroup?: boolean;
  online?: boolean;
  imageUrl?: string | null;
}

export default function Avatar({ name, color, size = 48, isGroup, online, imageUrl }: AvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center text-white font-medium select-none"
          style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
        >
          {isGroup ? <Users size={size * 0.5} /> : initials(name)}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-signal-online border-2 border-white dark:border-signal-bg-dark"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
