import { Alert, Platform } from "react-native";

export interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onCancel?: () => void;
}

/**
 * Universal confirm modal that works seamlessly across iOS, Android, and Web.
 * On Web, uses window.confirm since React Native Web Alert.alert ignores buttons.
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  options?: ConfirmOptions
) {
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    const ok = typeof window !== "undefined" ? window.confirm(text) : true;
    if (ok) {
      onConfirm();
    } else if (options?.onCancel) {
      options.onCancel();
    }
  } else {
    Alert.alert(title, message, [
      {
        text: options?.cancelText || "Cancel",
        style: "cancel",
        onPress: options?.onCancel,
      },
      {
        text: options?.confirmText || "Confirm",
        style: options?.isDestructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ]);
  }
}

/**
 * Universal alert dialog that works on Web and Mobile.
 */
export function showAlert(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== "undefined") {
      window.alert(text);
    }
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : undefined);
  }
}
