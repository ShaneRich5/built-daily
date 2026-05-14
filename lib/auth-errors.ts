/** Map Firebase Auth error codes to short user-facing messages. */
export function mapAuthError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    switch (code) {
      case "auth/email-already-in-use":
        return "That email is already registered. Try signing in.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/weak-password":
        return "Use at least 6 characters for your password.";
      case "auth/user-disabled":
        return "This account was disabled.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
      case "auth/popup-blocked":
        return "Pop-up was blocked. Allow pop-ups for this site or try again.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled.";
      case "auth/unauthorized-domain":
        return "This domain is not allowed. Add it in Firebase Authentication settings.";
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email using a different sign-in method.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
