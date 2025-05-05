 "use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 3 // Increased limit slightly
const TOAST_REMOVE_DELAY = 5000 // Reduced delay for auto-removal

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    // Clear existing timeout if it exists, to reset duration on update/re-add
    clearTimeout(toastTimeouts.get(toastId));
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY); // Use the defined delay

  toastTimeouts.set(toastId, timeout);
};


export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // If limit is reached, remove the oldest toast that isn't the one being added
        let newToasts = [action.toast, ...state.toasts];
        if (newToasts.length > TOAST_LIMIT) {
            // Find the oldest toast's ID (last element after adding the new one)
            const oldestToastId = newToasts[TOAST_LIMIT]?.id;
            if (oldestToastId) {
                // Remove the oldest toast immediately
                 newToasts = newToasts.filter(t => t.id !== oldestToastId);
                 // Clear its timeout if it exists
                 if (toastTimeouts.has(oldestToastId)) {
                    clearTimeout(toastTimeouts.get(oldestToastId));
                    toastTimeouts.delete(oldestToastId);
                 }
            } else {
                 // Fallback: just slice if oldestToastId logic fails
                 newToasts = newToasts.slice(0, TOAST_LIMIT);
            }
        }
        // Ensure the new toast gets its removal timeout set
        addToRemoveQueue(action.toast.id);
        return {
            ...state,
            toasts: newToasts,
        };


    case "UPDATE_TOAST":
      // When updating, reset the removal timeout for the updated toast
        if (action.toast.id) {
            addToRemoveQueue(action.toast.id);
        }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Start removal timeout immediately on dismiss
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false, // Trigger close animation
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      // Clean up timeout map when removing
        if (action.toastId && toastTimeouts.has(action.toastId)) {
            clearTimeout(toastTimeouts.get(action.toastId));
            toastTimeouts.delete(action.toastId);
        } else if (action.toastId === undefined) {
            // Clear all timeouts if removing all toasts
             toastTimeouts.forEach(timeout => clearTimeout(timeout));
             toastTimeouts.clear();
        }

      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ duration = TOAST_REMOVE_DELAY, ...props }: Toast & { duration?: number }) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      duration: duration, // Pass duration to the toast component if needed for visuals
      onOpenChange: (open) => {
        if (!open) {
            // Don't call dismiss here, let the timeout handle removal
            // Or if manual close button is used, it should trigger DISMISS_TOAST directly
        }
      },
    },
  })

   // Set timeout for removal based on duration
   const timeout = setTimeout(() => {
       dispatch({ type: "REMOVE_TOAST", toastId: id });
   }, duration);
   toastTimeouts.set(id, timeout); // Manage timeout


  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

    