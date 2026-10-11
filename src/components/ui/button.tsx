import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-transparent bg-clip-padding font-sans text-[15px] leading-none font-semibold whitespace-nowrap transition-[filter,background-color] outline-none select-none hover:brightness-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-late-ink [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border-input bg-transparent text-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        ghost:
          "bg-transparent text-foreground hover:bg-muted hover:brightness-100",
        destructive: "bg-destructive text-destructive-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-5",
        xs: "h-9 gap-1.5 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        sm: "h-9 gap-1.5 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-6",
        icon: "size-11",
        "icon-xs": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
