declare namespace WechatMiniprogram {
  interface Animation {
    export(): any
    step(options?: StepOption): Animation
    matrix(): Animation
    matrix3d(): Animation
    rotate(): Animation
    rotate3d(): Animation
    rotateX(): Animation
    rotateY(): Animation
    rotateZ(): Animation
    scale(): Animation
    scale3d(): Animation
    scaleX(): Animation
    scaleY(): Animation
    scaleZ(): Animation
    skew(): Animation
    skewX(): Animation
    skewY(): Animation
    translate(): Animation
    translate3d(): Animation
    translateX(): Animation
    translateY(): Animation
    translateZ(): Animation
  }

  interface StepOption {
    duration?: number
    timingFunction?: string
    delay?: number
    transformOrigin?: string
  }

  interface IData {
    isPlaying: boolean
    currentNews: string
    displayedNews: string
    charIndex: number
    mouthOpen: boolean
    mouthAnimation: Animation | null
    newsType: string
  }

  interface Cloud {
    init(config: { env: string }): void
    callFunction(params: { name: string; data?: any }): Promise<any>
  }

  interface Toast {
    title: string
    icon?: 'success' | 'loading' | 'none'
    duration?: number
  }

  interface InnerAudioContext extends InnerAudioContext {}
}

interface RequestOption<T = any> {
  url: string
  method?: 'GET' | 'POST'
  data?: any
  header?: {
    'content-type': string
  }
}

interface RequestResult<T = any> {
  data: T
  statusCode: number
  header: any
  cookies: string[]
}

declare const wx: {
  createAnimation(option: WechatMiniprogram.StepOption): WechatMiniprogram.Animation
  request<T = any>(options: RequestOption<T>): Promise<RequestResult<T>>
  cloud: WechatMiniprogram.Cloud
  showToast(options: WechatMiniprogram.Toast): void
  showLoading(options: { title: string }): void
  hideLoading(): void
  createInnerAudioContext(): InnerAudioContext
  getStorageSync(key: string): any
  setStorageSync(key: string, data: any): void
}

interface InnerAudioContext {
  src: string
  startTime: number
  autoplay: boolean
  loop: boolean
  obeyMuteSwitch: boolean
  volume: number
  play(): void
  pause(): void
  stop(): void
  seek(position: number): void
  destroy(): void
  onPlay(callback: () => void): void
  onPause(callback: () => void): void
  onStop(callback: () => void): void
  onEnded(callback: () => void): void
  onError(callback: (res: { errMsg: string }) => void): void
}

declare function Page<T extends WechatMiniprogram.IData>(options: {
  data: T
  onLoad?(): void
  onUnload?(): void
  [key: string]: any
}): void

declare function getApp<T>(): T
declare function setInterval(callback: () => void, ms: number): number
declare function clearInterval(handle: number): void
declare const console: Console 