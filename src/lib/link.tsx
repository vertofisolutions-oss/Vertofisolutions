import React from "react";
import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router-dom";

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href?: string;
  to?: string;
  children?: React.ReactNode;
}

export default function Link({ href, to, ...props }: LinkProps) {
  const target = to || href || "/";
  if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("mailto:") || target.startsWith("tel:") || target.startsWith("#")) {
    return <a href={target} {...props} />;
  }
  return <RouterLink to={target} {...(props as any)} />;
}
