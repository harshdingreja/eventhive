import { useCallback, useEffect, useState } from 'react';

// Loads data when the component mounts (and whenever `deps` change), tracking the
// three states every screen needs: loading, error and data.
//   const { data, error, loading, reload } = useApi(() => api.get('/events'), []);
// reload() fetches again but keeps showing the old data meanwhile, so polling and
// refreshing after an action never flash a spinner.
export function useApi(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false; // ignore answers that arrive after the component moved on
    setState((s) => ({ ...s, loading: true }));

    loader()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState((s) => ({ data: s.data, error, loading: false }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
