// 이메일 계정 기반 "내 기기끼리" 동기화 (Supabase 버전)
// 강릉분원 앱과 달리, 이건 "팀 전체 공유"가 아니라 "같은 이메일로 로그인하면
// 모바일·PC·노트북에서 내 일정이 똑같이 보인다"는 개인용 동기화입니다.
//
// Supabase 콘솔(supabase.com)에서 프로젝트를 만들고 "API Keys"에서 받은
// Project URL과 anon(publishable) 키를 아래에 붙여넣으면 켜집니다.
// 비워두면 이 기능은 자동으로 꺼지고, 지금처럼 각 브라우저에만 저장되는 방식으로 동작합니다.
//
// App.tsx / AccountModal.tsx는 Firebase 때와 똑같은 함수 이름(getAuth, watchUserDoc,
// saveUserDoc 등)을 그대로 호출합니다 - 이 파일 안에서 Supabase를 그 모양에 맞게 감싸서,
// 다른 파일은 손대지 않아도 되게 만들었습니다.

declare global {
  interface Window {
    supabase: any;
  }
}

export const SUPABASE_CONFIG = {
  url: 'https://xrubqlusyjxqngwscgzb.supabase.co',
  anonKey: 'sb_publishable_Ysd0kIWgX2s1t_iKxqDfxg_gRqm1UXn',
};

export const SYNC_ENABLED = !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);

let client: any = null;

function getClient() {
  if (!SYNC_ENABLED) return null;
  if (!client && window.supabase) {
    client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return client;
}

export function initSync() {
  if (!SYNC_ENABLED) return null;
  getClient();
  return { authApi: getAuth(), dbApi: getClient() };
}

function mapUser(u: any) {
  if (!u) return null;
  return { uid: u.id, email: u.email };
}

// Supabase 오류 메시지를 Firebase 스타일 코드로 바꿔서, AccountModal.tsx가 그대로 처리할 수 있게 합니다.
function mapAuthError(error: any) {
  const msg = (error?.message || '').toLowerCase();
  let code = 'auth/unknown';
  if (msg.includes('already registered') || msg.includes('already exists')) code = 'auth/email-already-in-use';
  else if (msg.includes('invalid login credentials') || msg.includes('invalid email')) code = 'auth/invalid-credential';
  else if (msg.includes('password') && (msg.includes('6') || msg.includes('short') || msg.includes('weak')))
    code = 'auth/weak-password';
  else if (msg.includes('user not found') || msg.includes('no user')) code = 'auth/user-not-found';
  const e: any = new Error(error?.message || '알 수 없는 오류');
  e.code = code;
  return e;
}

export function getAuth() {
  const c = getClient();
  if (!c) return null;
  return {
    onAuthStateChanged: (callback: (user: any) => void) => {
      c.auth.getSession().then(({ data }: any) => {
        callback(mapUser(data?.session?.user));
      });
      const { data: sub } = c.auth.onAuthStateChange((_event: string, session: any) => {
        callback(mapUser(session?.user));
      });
      return () => sub.subscription.unsubscribe();
    },
    signInWithEmailAndPassword: async (email: string, password: string) => {
      const { error } = await c.auth.signInWithPassword({ email, password });
      if (error) throw mapAuthError(error);
    },
    createUserWithEmailAndPassword: async (email: string, password: string) => {
      const { error } = await c.auth.signUp({ email, password });
      if (error) throw mapAuthError(error);
    },
    signOut: async () => {
      await c.auth.signOut();
    },
  };
}

export function getDb() {
  return getClient();
}

export interface SyncedData {
  events?: any[];
  churchConfig?: any;
  updatedAt?: number;
}

export function watchUserDoc(uid: string, onData: (data: SyncedData | null) => void, onError?: (e: any) => void) {
  const c = getClient();
  if (!c) return () => {};

  const toSyncedData = (row: any): SyncedData | null =>
    row ? { events: row.events, churchConfig: row.church_config, updatedAt: row.updated_at } : null;

  // 처음 접속했을 때 한 번 불러오기
  c.from('user_data')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()
    .then(({ data, error }: any) => {
      if (error) {
        onError?.(error);
        return;
      }
      onData(toSyncedData(data));
    });

  // 다른 기기가 바꾸면 실시간으로 반영
  const channel = c
    .channel(`user_data_${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${uid}` },
      (payload: any) => {
        onData(toSyncedData(payload.new));
      }
    )
    .subscribe();

  return () => {
    c.removeChannel(channel);
  };
}

export async function saveUserDoc(uid: string, data: SyncedData): Promise<number> {
  const c = getClient();
  if (!c) return Date.now();
  const cleaned = JSON.parse(JSON.stringify(data));
  // updated_at은 클라이언트가 보내지 않습니다 - 서버(DB)의 트리거가 자동으로 채웁니다.
  // (기기마다 시계가 조금씩 다를 수 있어서, "누가 더 최신인지"는 항상 서버 시각 기준으로 판단합니다)
  const { data: row, error } = await c
    .from('user_data')
    .upsert({
      user_id: uid,
      events: cleaned.events ?? [],
      church_config: cleaned.churchConfig ?? {},
    })
    .select('updated_at')
    .single();
  if (error) {
    console.error('클라우드 저장 실패:', error);
    throw error;
  }
  return row?.updated_at ?? Date.now();
}
