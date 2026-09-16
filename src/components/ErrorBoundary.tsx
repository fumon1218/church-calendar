import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Church Calendar:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#EDE8DA',
          color: '#222B32',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            backgroundColor: '#FFFFFF',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #DCD4BD'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#B24638' }}>
              화면을 불러오는 중 문제가 발생했습니다
            </h2>
            <p style={{ fontSize: '14px', color: '#5C6773', marginBottom: '20px', lineHeight: 1.6 }}>
              로컬 저장소의 이전 캐시 데이터와의 충돌일 수 있습니다. 아래 버튼을 눌러 데이터를 초기화하거나 새로고침해 보세요.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#344B68',
                  color: '#FFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                새로고침
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch (e) {}
                  window.location.reload();
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#FFF',
                  color: '#B24638',
                  border: '1px solid #B24638',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                저장 데이터 초기화
              </button>
            </div>
            {this.state.error && (
              <pre style={{
                marginTop: '20px',
                padding: '12px',
                backgroundColor: '#F7F3EB',
                borderRadius: '8px',
                fontSize: '12px',
                textAlign: 'left',
                overflowX: 'auto',
                color: '#666'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
