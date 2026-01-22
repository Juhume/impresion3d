/**
 * Hook para implementar Focus Trap en modales y drawers
 * Mejora la accesibilidad manteniendo el foco dentro del contenedor
 */

import { useEffect, useRef, useCallback } from 'react';
import { getFocusableElements } from '../lib/utils';

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusOnDeactivate?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>({
  isActive,
  onEscape,
  initialFocusRef,
  returnFocusOnDeactivate = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Manejar Tab y Shift+Tab para mantener el foco dentro
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!containerRef.current || !isActive) return;

      // Escape para cerrar
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Solo manejar Tab
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      // Shift + Tab en el primer elemento -> ir al último
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab en el último elemento -> ir al primero
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      // Si el foco está fuera del contenedor, moverlo al primero
      if (!containerRef.current.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [isActive, onEscape]
  );

  // Activar/desactivar el focus trap
  useEffect(() => {
    if (!isActive) return;

    // Guardar el elemento activo actual para restaurarlo después
    previousActiveElement.current = document.activeElement;

    // Añadir listener
    document.addEventListener('keydown', handleKeyDown);

    // Mover foco al elemento inicial o al primer elemento focusable
    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    // Pequeño delay para asegurar que el contenido está renderizado
    const timeoutId = setTimeout(setInitialFocus, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);

      // Restaurar el foco al elemento anterior
      if (returnFocusOnDeactivate && previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, handleKeyDown, initialFocusRef, returnFocusOnDeactivate]);

  return containerRef;
}

export default useFocusTrap;
