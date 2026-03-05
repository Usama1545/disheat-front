import { Skeleton } from "@heroui/react";
import React from "react";

const SkeletonTabButton: React.FC = () => {
  return (
    <div
      className="
        flex flex-col items-center justify-center gap-1
        sm:px-1 py-2 sm:min-w-[72px] min-w-[50px]
        border-b-2 border-transparent
      "
    >
      {/* Icon Skeleton */}
      <div
        className="
          flex items-center justify-center
          w-10 h-10 md:w-12 md:h-12 rounded-sm
          bg-default-100
        "
      >
        <Skeleton className="w-6 h-6 md:w-8 md:h-8 rounded-sm" />
      </div>

      {/* Title Skeleton */}
      <Skeleton className="h-3 w-12 rounded-sm mt-1" />
    </div>
  );
};

export default SkeletonTabButton;
