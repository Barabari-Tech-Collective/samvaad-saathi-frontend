function Loading() {
  return (
    <div className="flex flex-col py-6">
      {/* Header skeleton - greeting and avatar */}
      <div className="flex justify-between items-center relative mb-6">
        <div className="skeleton h-8 w-32"></div>
        <div className="skeleton w-12 h-12 rounded-full"></div>
      </div>

      {/* Recent Interviews section skeleton */}
      <div className="my-6">
        <div className="skeleton h-8 w-48 mb-4"></div>

        {/* Interview card skeleton */}
        <div className="card bg-base-100 w-full shadow-lg">
          <div className="card-body">
            {/* Title and difficulty badge row */}
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="skeleton h-6 w-32"></div>
                <div className="skeleton h-4 w-48"></div>
              </div>
              <div className="skeleton h-6 w-16 rounded-full"></div>
            </div>

            {/* Progress section skeleton */}
            <div className="flex items-center gap-4 mb-4">
              {/* Circular progress placeholder */}
              <div className="skeleton w-[120px] h-[120px] rounded-full shrink-0"></div>

              {/* Performance scores text */}
              <div className="flex-1 space-y-3">
                <div className="skeleton h-4 w-40"></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="skeleton w-3 h-3 rounded-full"></div>
                    <div className="skeleton h-3 w-36"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="skeleton w-3 h-3 rounded-full"></div>
                    <div className="skeleton h-3 w-32"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable insights skeleton */}
            <div className="space-y-2 mb-4">
              <div className="skeleton h-4 w-40"></div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="skeleton w-2 h-2 rounded-full mt-1.5"></div>
                  <div className="skeleton h-3 w-full"></div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="skeleton w-2 h-2 rounded-full mt-1.5"></div>
                  <div className="skeleton h-3 w-5/6"></div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="skeleton w-2 h-2 rounded-full mt-1.5"></div>
                  <div className="skeleton h-3 w-4/6"></div>
                </div>
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div className="card-actions justify-end">
              <div className="skeleton h-8 w-24 rounded-lg"></div>
              <div className="skeleton h-8 w-28 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Get Started button skeleton */}
      <div className="skeleton h-14 w-full rounded-lg"></div>
    </div>
  );
}

export default Loading;
