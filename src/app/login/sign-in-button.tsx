"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/app/auth-client";

export function SignInButton() {
  return (
    <Button
      className="w-full"
      onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
    >
      Se connecter avec Google
    </Button>
  );
}
