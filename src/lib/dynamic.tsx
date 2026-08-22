import React, { Suspense, lazy } from "react";

export default function dynamic(importFn: any, options?: any) {
  const LazyComponent = lazy(importFn);
  return function DynamicWrapper(props: any) {
    return (
      <Suspense fallback={null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
