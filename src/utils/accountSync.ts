// 이메일 계정 기반 "내 기기끼리" 동기화
// 강릉분원 앱과 달리, 이건 "팀 전체 공유"가 아니라 "같은 이메일로 로그인하면
// 모바일·PC·노트북에서 내 일정이 똑같이 보인다"는 개인용 동기화입니다.
//
// Firebase 콘솔(console.firebase.google.com)에서 프로젝트를 만들고
// "웹 앱 추가"로 받은 설정값을 아래에 붙여넣으면 켜집니다.
// 비워두면 이 기능은 자동으로 꺼지고, 지금처럼 각 브라우저에만 저장되는 방식으로 동작합니다.
declare global {
  interface Window {
    firebase: any;
  }
}

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBdHHhQBsAHGrYzwuQ5pW77bjscmnNdrdA",
  authDomain: "church-calendar-sync-e7f83.firebaseapp.com",
  projectId: "church-calendar-sync-e7f83",
  storageBucket: "church-calendar-sync-e7f83.firebasestorage.app",
  messagingSenderId: "839438592205",
  appId: "1:839438592205:web:a9ef5ab1cd4db1b2882184"
};

export const SYNC_ENABLED = !!((FIREBASE_CONFIG as any).apiKey && (FIREBASE_CONFIG as any).projectId);

let app: any = null;
let authApi: any = null;
let dbApi: any = null;

export function initSync() {
  if (!SYNC_ENABLED || !window.firebase) return null;
  if (!app) {
    app = window.firebase.initializeApp(FIREBASE_CONFIG);
    authApi = window.firebase.auth();
    dbApi = window.firebase.firestore();
  }
  return { authApi, dbApi };
}

export function getAuth() {
  return authApi;
}

export function getDb() {
  return dbApi;
}

export interface SyncedData {
  events?: any[];
  churchConfig?: any;
  updatedAt?: number;
}

export function watchUserDoc(uid: string, onData: (data: SyncedData | null) => void, onError?: (e: any) => void) {
  if (!dbApi) return () => {};
  return dbApi
    .collection('users')
    .doc(uid)
    .onSnapshot(
      (doc: any) => onData(doc.exists ? doc.data() : null),
      (err: any) => onError?.(err)
    );
}

export function saveUserDoc(uid: string, data: SyncedData) {
  if (!dbApi) return Promise.resolve();
  return dbApi
    .collection('users')
    .doc(uid)
    .set({ ...data, updatedAt: Date.now() }, { merge: true });
}
