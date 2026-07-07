import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack || '');
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <p className="text-sm font-bold text-red-600">Something went wrong</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
