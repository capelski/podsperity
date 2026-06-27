import { initializeApp } from "firebase-admin/app";
import corsLib from "cors";

// Initialize the Admin SDK once for the whole functions runtime. Both function
// modules import from here, so this runs exactly once regardless of which
// function is invoked.
initializeApp();

export const cors = corsLib({ origin: true });
