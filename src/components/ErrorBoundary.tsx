import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; resetKey?: string }
type State = { error: Error | null }

/**
 * 顶层错误边界：任何页面渲染时抛出的异常都被这里兜住，
 * 显示可读的错误信息，而不是整页变白「功能凭空消失」。
 * resetKey 变化时（如切换页面）自动清除错误，避免一次崩溃卡死整站。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // 同时打到控制台，方便排查
    console.error('[ErrorBoundary] 页面崩溃：', error, info)
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-red-100 shadow-sm p-6">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-slate-800">页面出了一点问题</h2>
            <p className="text-sm text-slate-500 mt-1">
              某个功能运行时报错了。错误已被拦下，没有弄丢整个网站。请把下面这段发给我，我就能精确定位：
            </p>
            <pre className="mt-3 text-xs bg-slate-900 text-red-300 rounded-xl p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
