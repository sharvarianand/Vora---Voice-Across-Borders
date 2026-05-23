import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)", 
  "/(.*)/campaigns(.*)", 
  "/(.*)/leads(.*)"
]);

const hasClerkConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

const authMiddleware = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default hasClerkConfig ? authMiddleware : function proxy() {
  return NextResponse.next();
};

export const config = {
  matcher: ["/dashboard(.*)"],
};
