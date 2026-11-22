import Image from "next/image";
import styles from "./Logo.module.css";

interface LogoProps {
  /** Same intrinsic box the call site used for the colour PNG. */
  width: number;
  height: number;
  alt: string;
  /** The call site's sizing class still owns the rendered size. */
  className?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  /** "auto" follows data-theme; "dark" is for video / always-dark panels. */
  surface?: "auto" | "dark";
}

/**
 * One logo for every surface. Both images are rendered in "auto" mode and CSS
 * picks one from <html data-theme>, so the theme can change without a React
 * render (no hydration mismatch, no flash). Dark keeps the colour PNG; light
 * switches to the ink-coloured mono mark. Always-dark surfaces opt out with
 * surface="dark" and keep the colour PNG in both themes.
 */
export function Logo({
  width,
  height,
  alt,
  className,
  priority,
  loading,
  surface = "auto",
}: LogoProps) {
  // priority and loading are mutually exclusive in next/image.
  const fetchProps = priority ? { priority } : loading ? { loading } : {};

  if (surface === "dark") {
    return <Image src="/logo/logo_2.png" alt={alt} width={width} height={height} className={className} {...fetchProps} />;
  }

  return (
    <>
      <Image
        src="/logo/logo_2.png"
        alt={alt}
        width={width}
        height={height}
        className={[className, styles.colour].filter(Boolean).join(" ")}
        {...fetchProps}
      />
      <Image
        src="/logo/logo-mono.svg"
        alt={alt}
        width={width}
        height={height}
        className={[className, styles.mono].filter(Boolean).join(" ")}
        {...fetchProps}
      />
    </>
  );
}
