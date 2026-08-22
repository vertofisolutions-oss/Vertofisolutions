import { useNavigate, useLocation, useSearchParams as useRouterSearchParams, useParams } from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    prefetch: () => {},
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useSearchParams() {
  const [params] = useRouterSearchParams();
  return params;
}

export { useParams };
