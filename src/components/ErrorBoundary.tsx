import { Component, type ReactNode, type ErrorInfo } from "react";
import "../index.css";

const LSB_KEYS = ["jsb_fields", "jsb_widths", "jsb_isDark", "jsb_mocks"];

function clearAppStorage(): void {
  LSB_KEYS.forEach((k) => localStorage.removeItem(k));
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[JsonSchemaBuilder] Uncaught render error:", error, info);
  }

  handleReset = (): void => {
    clearAppStorage();
    this.setState({ error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message ?? "Unknown error";

    return (
      <div className="error-boundary">
        <div className="error-boundary__icon">⚠️</div>
        <h2 className="error-boundary__title">Something went wrong</h2>
        <p className="error-boundary__desc">
          The app encountered an unexpected error. This is often caused by
          invalid or corrupted data in local storage.
        </p>
        <pre className="error-boundary__message">{msg}</pre>
        <div className="error-boundary__actions">
          <button
            className="error-boundary__btn-primary"
            onClick={this.handleReset}
          >
            Clear storage &amp; reload
          </button>
          <button
            className="error-boundary__btn-secondary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
