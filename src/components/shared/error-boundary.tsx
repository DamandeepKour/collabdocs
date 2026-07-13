"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Reusable error boundary for feature islands.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>{this.props.fallbackTitle ?? "Something went wrong"}</CardTitle>
            <CardDescription>
              An unexpected error occurred. You can try again without losing
              local edits (offline-first).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {this.state.message ?? "Unknown error"}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => this.setState({ hasError: false, message: undefined })}
            >
              Try again
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}
