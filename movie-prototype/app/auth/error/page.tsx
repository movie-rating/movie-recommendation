import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

// Map error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, { title: string; message: string; action?: string }> = {
  verification_failed: {
    title: "Verification Failed",
    message: "We couldn't verify your email. The link may have expired or already been used.",
    action: "Please try signing up again or request a new confirmation email."
  },
  invalid_request: {
    title: "Invalid Request",
    message: "The confirmation link appears to be invalid or incomplete.",
    action: "Please check your email for the correct link or request a new one."
  },
  default: {
    title: "Something Went Wrong",
    message: "We encountered an unexpected error.",
    action: "Please try again or contact support if the problem persists."
  }
};

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const errorCode = params?.code || 'default';
  const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {errorInfo.message}
      </p>
      {errorInfo.action && (
        <p className="text-sm text-muted-foreground">
          {errorInfo.action}
        </p>
      )}
      <div className="flex flex-col gap-2 pt-2">
        <Link
          href="/auth/login"
          className="text-sm text-primary hover:underline"
        >
          Back to Login
        </Link>
        <Link
          href="/auth/sign-up"
          className="text-sm text-primary hover:underline"
        >
          Create a new account
        </Link>
      </div>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
