import { getProviderData } from "@flags-sdk/vercel";
import { createFlagsDiscoveryEndpoint } from "flags/next";
import * as flags from "../../../../flags";

/** Lets Flags Explorer (Vercel Toolbar) list the app's flags and override them per browser. */
export const GET = createFlagsDiscoveryEndpoint(async () => getProviderData(flags));
