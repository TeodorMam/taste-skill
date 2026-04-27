import { type Profile, profileInitials } from "@/lib/supabase";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizes: Record<AvatarSize, { container: string; text: string; icon: number }> = {
  xs: { container: "h-5 w-5",  text: "text-[8px]",  icon: 11 },
  sm: { container: "h-7 w-7",  text: "text-[11px]", icon: 15 },
  md: { container: "h-10 w-10", text: "text-sm",    icon: 20 },
  lg: { container: "h-12 w-12", text: "text-base",  icon: 24 },
  xl: { container: "h-14 w-14", text: "text-base",  icon: 28 },
};

export function Avatar({
  profile,
  size = "md",
}: {
  profile: Profile | null | undefined;
  size?: AvatarSize;
}) {
  const { container, text, icon } = sizes[size];

  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        className={`${container} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const hasName = !!profile?.display_name?.trim();

  return (
    <div className={`flex ${container} shrink-0 items-center justify-center rounded-full bg-[#5a6b32]/10`}>
      {hasName ? (
        <span className={`${text} font-semibold text-[#5a6b32]`}>
          {profileInitials(profile, null)}
        </span>
      ) : (
        <PersonIcon size={icon} />
      )}
    </div>
  );
}

function PersonIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-stone-400"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
