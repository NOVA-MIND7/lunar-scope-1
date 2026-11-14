import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  fallback: (message: string) => ReactNode;
  children: ReactNode;
}

/** Catches render/initialisation failures in the 3D scene so the rest of the app keeps working. */
export class GlobeErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lunar globe failed:', error, info.componentStack);
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error.message) : this.props.children;
  }
}
