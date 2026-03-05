import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  highlightText?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  highlightText,
}) => {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col gap-0">
        <h1 className="xl:text-xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-foreground/50 xl:text-medium text-xs">
            {subtitle}{" "}
            {highlightText && (
              <span className="font-semibold text-primary">
                {highlightText}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
