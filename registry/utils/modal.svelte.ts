import type { Component } from "svelte";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export type ModalOptions<P = Record<string, any>> = {
  /** Props passed directly to the component */
  props?: P;
  title?: string;
  size?: ModalSize;
  dismissible?: boolean;
  /** Called when the modal is closed by backdrop, X button, or modal.close() */
  onDismiss?: () => void;
};

export type ModalInstance<P = Record<string, any>> = {
  id: string;
  component: Component<P & { onClose: () => void }>;
  options: ModalOptions<P>;
};

class ModalManager {
  // Svelte 5 reactive state array
  instances = $state<ModalInstance[]>([]);

  /**
   * Opens a modal.
   * @param component The Svelte component to render.
   * @param options Options including props for the component. Type-checked.
   */
  open<P extends Record<string, any>>(
    component: Component<P & { onClose: () => void }>,
    options?: ModalOptions<P>,
  ): string {
    const id = Math.random().toString(36).substring(2, 9);
    const instance: ModalInstance<P> = {
      id,
      component,
      options: {
        size: "md",
        dismissible: true,
        ...options,
      },
    };
    this.instances.push(instance as any);
    return id;
  }

  close(id: string) {
    const index = this.instances.findIndex((m) => m.id === id);
    if (index !== -1) {
      const instance = this.instances[index];
      instance.options.onDismiss?.();
      this.instances.splice(index, 1);
    }
  }

  closeAll() {
    [...this.instances].forEach((m) => this.close(m.id));
  }
}

export const modal = new ModalManager();
