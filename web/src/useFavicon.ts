import { useEffect } from 'react';

export function useFavicon(iconUrl: string) {
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    link.href = iconUrl;
  }, [iconUrl]);
}