import type { ImgHTMLAttributes } from "react";
export default function Image({
  priority: _priority,
  unoptimized: _unoptimized,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; unoptimized?: boolean }) {
  void _priority;
  void _unoptimized;
  return <img alt={alt} {...props} />;
}
