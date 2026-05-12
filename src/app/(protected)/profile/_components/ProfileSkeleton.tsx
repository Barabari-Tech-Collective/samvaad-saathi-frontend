export function ProfileSkeleton() {
  return (
    <main className="max-w-md mx-auto">
      <section className="card bg-base-200 shadow-xl">
        <div className="card-body items-center text-center">
          <div className="avatar">
            <div className="w-20 rounded-full">
              <div className="skeleton w-full h-full"></div>
            </div>
          </div>
          <div className="skeleton h-8 w-32 mt-4"></div>
          <div className="skeleton h-4 w-24 mt-2"></div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="skeleton h-3 w-24 mb-2"></div>
            <div className="skeleton h-8 w-12"></div>
          </div>
        </div>

        <div className="card-body space-y-4">
          <div className="flex justify-between items-center">
            <div className="skeleton h-6 w-40"></div>
            <div className="skeleton h-10 w-10 rounded-lg"></div>
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index}>
                <div className="skeleton h-4 w-20 mb-2"></div>
                <div className="skeleton h-12 w-full rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-actions">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="w-full">
              <div className="flex items-center gap-3 p-4">
                <div className="skeleton h-6 w-6"></div>
                <div className="skeleton h-4 w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
