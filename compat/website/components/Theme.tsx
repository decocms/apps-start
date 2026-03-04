export interface Font {
  family: string;
  styleSheet?: string;
}

interface ThemeProps {
  colorScheme?: string;
  mainColors?: Record<string, string>;
  buttonStyle?: Record<string, string>;
  font?: Font;
}

function SiteTheme(_props: ThemeProps) {
  return null;
}

export default SiteTheme;
