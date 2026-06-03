export const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
};

export const handleDiscordRedirect = () => {
  window.open('https://discord.gg/KjWmrSwMXg', '_blank');
};

export const handleYoutubeRedirect = () => {
  window.open('https://www.youtube.com/@oxlynfivem', '_blank');
};

export const handleTebexRedirect = () => {
  window.open('https://www.tebex.io/', '_blank');
};

export const formatCategoryName = (name: string): string => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
