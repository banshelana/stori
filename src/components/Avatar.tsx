"use client";

/**
 * Uploaded photo when there is one, coloured initials otherwise.
 *
 * Shared so the header, sidebar and admin table can never drift into
 * showing different things for the same user.
 */
export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  avatarColor = "#4f46e5",
  size = "md",
  rounded = "lg",
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  avatarColor?: string;
  size?: "sm" | "md" | "lg";
  rounded?: "lg" | "full";
}) {
  const dimensions = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-xs",
    lg: "h-20 w-20 text-xl",
  }[size];

  const shape = rounded === "full" ? "rounded-full" : "rounded-lg";
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${dimensions} ${shape} shrink-0 object-cover`}
      />
    );
  }

  return (
    <span
      className={`${dimensions} ${shape} flex shrink-0 items-center justify-center font-bold text-white`}
      style={{ backgroundColor: avatarColor }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
