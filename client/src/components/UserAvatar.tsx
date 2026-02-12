import { useTebex } from '../context/TebexContext';

interface UserAvatarProps {
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ className }) => {
  const { cfxUserData } = useTebex();

  const combinedClassName = `shrink-0 overflow-hidden ${className || 'h-8 w-8'}`;
  const svgIconClassName = `text-gray-500 ${className ? 'h-3/5 w-3/5' : 'h-5 w-5'}`;

  if (!cfxUserData || !cfxUserData.avatar_template) {
    return (
      <div className={`bg-gray-800 rounded-full flex items-center justify-center ring-1 ring-gray-700 ${combinedClassName}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={svgIconClassName} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
      </div>
    );
  }

  const avatarUrl = `https://forum.cfx.re${cfxUserData.avatar_template.replace('{size}', '128')}`;

  return (
    <img
      src={avatarUrl}
      alt={`${cfxUserData.username}'s Avatar`}
      className={`rounded-full aspect-square ${combinedClassName}`}
    />
  );
};

export default UserAvatar;