import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'next-auth';

interface UserAvatarProps {
  user: User;
}

export function UserAvatar({ user }: UserAvatarProps) {
  return (
    <Avatar>
      <AvatarImage src={user.image || ''} alt={user.name || 'User'} />
      <AvatarFallback>
        {user.name
          ? user.name.split(' ').map(n => n[0]).join('')
          : 'U'}
      </AvatarFallback>
    </Avatar>
  );
}