import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Closes the popup as soon as the transaction lands, refreshing the cached
 * on-chain reads on the way out — otherwise the dashboard behind it keeps
 * showing pre-transaction numbers.
 *
 * `onClose` is held in a ref because callers pass an inline arrow, so the
 * effect can depend on `isSuccess` alone and fire exactly once.
 */
export function useCloseOnSuccess(isSuccess: boolean, onClose: () => void) {
  const queryClient = useQueryClient();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isSuccess) return;
    queryClient.invalidateQueries();
    closeRef.current();
  }, [isSuccess, queryClient]);
}
