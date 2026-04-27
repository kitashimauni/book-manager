import { useEffect, useState } from "react";
import { getApiBaseUrl, getHealth, type ApiError, type HealthResponse } from "./api/client.js";
import { AppLayout } from "./components/AppLayout.js";
import { ErrorState, LoadingState } from "./components/StateBlocks.js";
import { BookDetailPage } from "./pages/BookDetailPage.js";
import { BookFormPage } from "./pages/BookFormPage.js";
import { BooksPage } from "./pages/BooksPage.js";
import { ClassificationTagsPage } from "./pages/ClassificationTagsPage.js";
import { DataPage } from "./pages/DataPage.js";
import { LocationsPage } from "./pages/LocationsPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { resolveRoute, type Route } from "./router.js";

export function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<ApiError | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname);
    }

    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", "/books");
      setCurrentPath("/books");
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      setIsHealthLoading(true);

      try {
        const result = await getHealth();

        if (isMounted) {
          setHealth(result);
          setHealthError(null);
        }
      } catch (error) {
        if (isMounted) {
          setHealth(null);
          setHealthError(error as ApiError);
        }
      } finally {
        if (isMounted) {
          setIsHealthLoading(false);
        }
      }
    }

    void loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const route = resolveRoute(currentPath);

  return (
    <AppLayout currentPath={currentPath}>
      <section className="overview-card">
        <div>
          <p className="eyebrow">Backend API</p>
          <code>{getApiBaseUrl()}</code>
        </div>
        <HealthBadge error={healthError} health={health} isLoading={isHealthLoading} />
      </section>
      {renderRoute(route)}
    </AppLayout>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
    case "books":
      return <BooksPage />;
    case "bookNew":
      return <BookFormPage mode="create" />;
    case "bookDetail":
      return <BookDetailPage bookId={route.id} />;
    case "bookEdit":
      return <BookFormPage bookId={route.id} mode="edit" />;
    case "locations":
      return <LocationsPage />;
    case "classificationTags":
      return <ClassificationTagsPage />;
    case "data":
      return <DataPage />;
    case "notFound":
      return <NotFoundPage />;
  }
}

type HealthBadgeProps = {
  error: ApiError | null;
  health: HealthResponse | null;
  isLoading: boolean;
};

function HealthBadge({ error, health, isLoading }: HealthBadgeProps) {
  if (isLoading) {
    return <LoadingState title="API確認中" />;
  }

  if (error) {
    return <ErrorState title="API未接続">{error.message}</ErrorState>;
  }

  return (
    <div className="health-badge">
      <span className="status-dot" />
      <div>
        <strong>{health?.service ?? "backend"}</strong>
        <span>DB: {health?.database ?? "unknown"}</span>
      </div>
    </div>
  );
}
