"use client";

import { useEffect } from "react";
import { setUpPwa } from "@/lib/pwa";

/** Mounted once in the root layout: registers the service worker and catches the install prompt. */
export function PwaSetup() {
  useEffect(() => {
    setUpPwa();
  }, []);
  return null;
}
