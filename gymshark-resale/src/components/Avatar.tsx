import { type Profile, profileInitials } from "@/lib/supabase";
import { browserSafeImage } from "@/lib/image";
import { Icon } from "@/components/Icon";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizes: Record<AvatarSize, { container: string; text: string; icon: number }> = {
  xs: { container: "h-5 w-5",  text: "text-[9px]",  icon: 11 },
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
        src={browserSafeImage(profile.avatar_url)}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${container} shrink-0 rounded-circle object-cover`}
      />
    );
  }

  const hasName = !!profile?.display_name?.trim();

  return (
    <div className={`flex ${container} shrink-0 items-center justify-center rounded-circle bg-[#DCD8CC]`}>
      {hasName ? (
        <span className={`${text} font-semibold tracking-[0.01em] text-ink-2`}>
          {profileInitials(profile, null)}
        </span>
      ) : (
        <Icon name="profil" size={icon} className="text-ink-3" />
      )}
    </div>
  );
}
