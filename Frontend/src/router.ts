export type Route =
  | { name: "books" }
  | { name: "bookNew" }
  | { name: "bookDetail"; id: string }
  | { name: "bookEdit"; id: string }
  | { name: "locations" }
  | { name: "classificationTags" }
  | { name: "data" }
  | { name: "notFound" };

export function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function resolveRoute(pathname: string): Route {
  if (pathname === "/") {
    return { name: "books" };
  }

  if (pathname === "/books") {
    return { name: "books" };
  }

  if (pathname === "/books/new") {
    return { name: "bookNew" };
  }

  const bookEditMatch = pathname.match(/^\/books\/([^/]+)\/edit$/);

  if (bookEditMatch) {
    return { name: "bookEdit", id: decodeURIComponent(bookEditMatch[1]) };
  }

  const bookDetailMatch = pathname.match(/^\/books\/([^/]+)$/);

  if (bookDetailMatch) {
    return { name: "bookDetail", id: decodeURIComponent(bookDetailMatch[1]) };
  }

  if (pathname === "/locations") {
    return { name: "locations" };
  }

  if (pathname === "/classification-tags") {
    return { name: "classificationTags" };
  }

  if (pathname === "/data") {
    return { name: "data" };
  }

  return { name: "notFound" };
}
