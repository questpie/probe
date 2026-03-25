export interface SnapshotOpts {
  interactive?: boolean
  compact?: boolean
  depth?: number
  selector?: string
  diff?: boolean
}

export interface ScreenshotOpts {
  path?: string
  annotate?: boolean
  full?: boolean
  selector?: string
}

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info'
  text: string
  timestamp?: string
  source?: string
}

export interface ErrorEntry {
  message: string
  stack?: string
  timestamp?: string
}

export interface NetworkEntry {
  method: string
  url: string
  status: number
  duration: number
  timestamp?: string
}

export interface ConsoleOpts {
  level?: 'log' | 'warn' | 'error' | 'info'
  clear?: boolean
  json?: boolean
}

export interface NetworkOpts {
  failed?: boolean
  method?: string
  grep?: string
  json?: boolean
}

export interface WaitOpts {
  ref?: string
  selector?: string
  url?: string
  text?: string
  network?: 'idle'
  hidden?: boolean
  timeout?: number
}

export interface BrowserDriver {
  open(url: string): Promise<void>
  back(): Promise<void>
  forward(): Promise<void>
  reload(): Promise<void>
  url(): Promise<string>
  title(): Promise<string>
  close(): Promise<void>

  snapshot(opts?: SnapshotOpts): Promise<string>
  click(ref: string): Promise<void>
  dblclick(ref: string): Promise<void>
  fill(ref: string, value: string): Promise<void>
  select(ref: string, value: string): Promise<void>
  check(ref: string): Promise<void>
  uncheck(ref: string): Promise<void>
  press(key: string): Promise<void>
  type(text: string): Promise<void>
  hover(ref: string): Promise<void>
  focus(ref: string): Promise<void>
  scroll(direction: string, px?: number): Promise<void>
  upload(ref: string, file: string): Promise<void>

  screenshot(opts?: ScreenshotOpts): Promise<string>
  eval(js: string): Promise<string>
  text(selector?: string): Promise<string>

  console(opts?: ConsoleOpts): Promise<ConsoleEntry[]>
  errors(): Promise<ErrorEntry[]>
  network(opts?: NetworkOpts): Promise<NetworkEntry[]>

  wait(opts: WaitOpts): Promise<void>
}
