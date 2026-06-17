interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const SkeletonText = ({ className = '' }: SkeletonProps) => (
  <Skeleton className={`h-4 ${className}`} />
);

export const SkeletonTitle = ({ className = '' }: SkeletonProps) => (
  <Skeleton className={`h-8 w-64 ${className}`} />
);

export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
  <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 ${className}`}>
    <Skeleton className="aspect-video w-full rounded-none" />
    <div className="p-6 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="pt-3 flex justify-between items-center">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  </div>
);

export const SkeletonRoomCard = ({ className = '' }: SkeletonProps) => (
  <div className={`group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 ${className}`}>
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="p-8 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-14 rounded-2xl" />
      </div>
    </div>
  </div>
);

export const SkeletonTableRow = ({ cols = 5 }: { cols?: number }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton className={`h-4 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-20' : 'w-24'}`} />
      </td>
    ))}
  </tr>
);

export const SkeletonMenuItem = () => (
  <div className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200">
    <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

export default Skeleton;
