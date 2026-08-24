import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** called once, so the loading screen stops waiting on a scene that will never arrive */
  onFail?: () => void;
}

/**
 * A scene chunk that fails to download must cost us the scene, not the page.
 * Without this, one aborted request takes the headline and every section
 * with it, because a rejected lazy() import throws all the way to the root.
 */
export default class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
