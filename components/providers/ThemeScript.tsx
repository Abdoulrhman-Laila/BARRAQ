/** Inline boot script — prevents light/dark flash before hydration. */
export function ThemeScript() {
  const code = `(function(){try{var k='baraq-theme';var t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){var m=document.cookie.match(/(?:^|; )baraq_theme=(dark|light)/);t=m?m[1]:null;}if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
