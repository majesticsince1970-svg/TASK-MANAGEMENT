import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts for Majestic Ops
 * N = new task, / = search, J/K = navigate, S = start task, D = done
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'n':
        case 'N':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigate('/tasks/new');
          }
          break;

        case '/':
          e.preventDefault();
          // Focus search input
          const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;

        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
            if (searchInput) searchInput.focus();
          }
          break;

        case 'g':
          if (!e.metaKey && !e.ctrlKey) {
            // Wait for second key
            const handleSecondKey = (e2: KeyboardEvent) => {
              document.removeEventListener('keydown', handleSecondKey);
              switch (e2.key) {
                case 'h': navigate('/'); break;
                case 't': navigate('/tasks'); break;
                case 'a': navigate('/approvals'); break;
                case 'p': navigate('/people'); break;
                case 'r': navigate('/reports'); break;
                case 's': navigate('/settings'); break;
              }
            };
            document.addEventListener('keydown', handleSecondKey, { once: true });
            setTimeout(() => document.removeEventListener('keydown', handleSecondKey), 1000);
          }
          break;

        case '?':
          // Show keyboard shortcuts help
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}

