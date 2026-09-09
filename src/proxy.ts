import { NextResponse, NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.rewrite(new URL("/no/", request.url));
}

export const config = {
  matcher: ["/"],
};
