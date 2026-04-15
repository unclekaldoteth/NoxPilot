export default function Loading() {
  return (
    <div className="container py-16">
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
