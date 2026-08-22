import React from "react";

export default function Image({ src, alt, width, height, className, priority, fill, ...props }: any) {
  return <img src={src} alt={alt || ""} width={width} height={height} className={className} {...props} />;
}
