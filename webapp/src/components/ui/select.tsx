"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
} | null>(null);

function Select({ value, onValueChange, children, disabled = false }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onValueChange, disabled }}>
      <div className="inline-block relative">{children}</div>
    </SelectContext.Provider>
  );
}

Select.displayName = "Select";

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    
    return (
      <button
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}
        disabled={context?.disabled || props.disabled}
        onClick={(e) => {
          if (!context?.disabled && !props.disabled) {
            // Toggle dropdown - will be handled by SelectContent
          }
          props.onClick?.(e);
        }}
      >
        <span className="flex-1 text-left">{children}</span>
        <svg className="ml-2 h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }
);

SelectTrigger.displayName = "SelectTrigger";

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const displayValue = children || context?.value || "";
    
    return (
      <span
        ref={ref}
        className={cn("line-clamp-1", className)}
        {...props}
      >
        {displayValue}
      </span>
    );
  }
);

SelectValue.displayName = "SelectValue";

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "popper" | "inline";
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, position = "popper", ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const [isOpen, setIsOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          contentRef.current && 
          !contentRef.current.contains(event.target as Node) &&
          triggerRef.current && 
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <>
        <SelectTrigger
          ref={triggerRef}
          onClick={() => !context?.disabled && setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <SelectValue>{context?.value}</SelectValue>
        </SelectTrigger>

        {isOpen && (
          <div
            ref={contentRef}
            className={cn(
              "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
              position === "popper" && "absolute mt-1",
              className
            )}
            {...props}
          >
            <div className="max-h-[300px] overflow-y-auto py-1">{children}</div>
          </div>
        )}
      </>
    );
  }
);

SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, disabled = false, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;

    const handleClick = () => {
      if (!disabled && !context?.disabled) {
        context?.onValueChange?.(value);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected && "bg-accent text-accent-foreground",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        data-value={value}
        data-disabled={disabled}
        data-selected={isSelected}
        onClick={handleClick}
        role="option"
        aria-selected={isSelected}
        {...props}
      >
        {children}
        {isSelected && (
          <svg className="absolute left-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    );
  }
);

SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };