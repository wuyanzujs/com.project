/// <reference types="@tarojs/taro" />

declare module '*.png';
declare module '*.gif';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.styl';

declare namespace NodeJS {
  interface ProcessEnv {
    /** NODE 内置环境变量, 会影响到最终构建生成产物 */
    NODE_ENV: 'development' | 'production',
    /** 当前 App 只构建 React Native 端 */
    TARO_ENV: 'rn'
    APP_ENV?: 'local' | 'dev' | 'test' | 'staging' | 'production'
    APP_API_BASE_URL?: string
    APP_WEB_BASE_URL?: string
    APP_SERVICE_WEB_URL?: string
    APP_MEMBER_WEB_URL?: string
    APP_WEB_ALLOWED_HOSTS?: string
    APP_SYSTEM_CODE?: string
    APP_CLIENT_CHANNEL?: string
    APP_OMS_CHANNEL?: string
    APP_ECARD_PMC_SYSTEM_CODE?: string
    APP_MOBILE_LOGIN_TYPE?: string
  }
}
