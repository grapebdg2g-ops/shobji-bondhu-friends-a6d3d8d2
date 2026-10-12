export function isPublicPage(pathname: string) {
  return pathname === "/" || pathname === "/prices" || pathname === "/vegetable-guide" || pathname === "/vegetable-guide/" || /^\/vegetable-guide\/[^/]+$/.test(pathname);
}