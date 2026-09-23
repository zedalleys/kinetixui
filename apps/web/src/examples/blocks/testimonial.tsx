import { Avatar, AvatarFallback, Quote } from "@kinetixui/ui";

// kx-block:start
export function TestimonialBlock() {
  return (
    <Quote
      author="Dieter Rams"
      authorTitle="Industrial Designer"
      avatar={
        <Avatar>
          <AvatarFallback>DR</AvatarFallback>
        </Avatar>
      }
      className="max-w-md"
    >
      Good design is as little design as possible.
    </Quote>
  );
}
// kx-block:end
