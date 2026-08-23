import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * After a transaction lands there's nothing left to do in the popup, so show
 * the confirmation just long enough to read and then close it — and refresh
 * the cached on-chain reads first, or the dashboard behind it keeps showing
 * pre-transaction numbers.
 *
 * `onClose` is held in a ref because callers pass an inline arrow: without it
 * every re-render would restart the timer and the popup would never close.
 */
export function useCloseOnSuccess(isSuccess: boolean, onClose: () => void, delayMs = 1200) {
  const queryClient = useQueryClient();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isSuccess) return;
    queryClient.invalidateQueries();
    const timer = setTimeout(() => closeRef.current(), delayMs);
    return () => clearTimeout(timer);
  }, [isSuccess, delayMs, queryClient]);
}
