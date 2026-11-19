const icons: Record<string, { className: string; decorative?: boolean }> = {
  moderation: { className: 'fas fa-dungeon' },
  user: { className: 'far fa-user' },
  logout: { className: 'fas fa-sign-out-alt' },
  home: { className: 'fas fa-home' },
  wall: { className: 'far fa-comment' },
  menuToggle: { className: 'fa fa-bars', decorative: true },
  darkTheme: { className: 'fa fa-moon-o', decorative: true },
  lightTheme: { className: 'fa fa-sun-o', decorative: true },
  likeTag: { className: 'fas fa-folder-plus' },
  dislikeTag: { className: 'fas fa-ban' },
  emailLogin: { className: 'fa fa-envelope-o', decorative: true },
  exit: { className: 'fa fa-times', decorative: true },
  sentDate: { className: 'far fa-calendar-alt' },
};

export type IconType = keyof typeof icons;

export const XIcon = ({ type }: { type: string }) => {
  const icon = icons[type];

  return <span className="x-icon">{icon && <i className={icon.className} aria-hidden={icon.decorative ? 'true' : undefined}></i>}</span>;
};
