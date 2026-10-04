import { Skeleton } from "@/components/ui/Panel";

export function PageFallback() {
  return (
    <div className="mx-auto grid max-w-[1320px] gap-4 px-5 py-8 md:px-8">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[420px] rounded-[20px]" />
        <Skeleton className="h-[420px] rounded-[20px]" />
      </div>
    </div>
  );
}
