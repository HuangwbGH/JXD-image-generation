import { destroySession } from "@/lib/auth/session";
import { handleRoute } from "@/lib/http";

export async function POST() {
  return handleRoute(async () => {
    await destroySession();
    return new Response(null, {
      status: 303,
      headers: { Location: "/login" }
    });
  });
}
