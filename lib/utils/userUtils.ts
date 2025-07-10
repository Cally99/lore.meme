export function getUserInitials(name?: string | null) {
  if (!name) return 'U';
  const parts = name.split(' ');
  let initials = '';
  if (parts.length > 0) initials += parts[0][0];
  if (parts.length > 1) initials += parts[parts.length - 1][0];
  return initials;
}